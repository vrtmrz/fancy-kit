import { RpcError, withTransfer } from "@vrtmrz/rpc";
import {
  connectWorkerRpc,
  createWorkerPool,
  createWorkerStreamBudget,
  readWorkerStream,
  type WorkerRpcClient,
  type WorkerRpcConnection,
} from "@vrtmrz/rpc/worker";
import workerSource from "harness:worker-rpc";
import { chunkBytes, contract, stoppedMessage } from "./contract.js";

type ReviewClient = WorkerRpcClient<typeof contract>;
type ReviewConnection = WorkerRpcConnection<typeof contract>;

const reviewTimeoutMs = 20_000;
const sample = [3, 1, 4, 1, 5] as const;
const cancelled = {
  status: "cancelled",
  detail: "The plug-in was unloaded during the Worker review.",
} as const;

interface ReviewResult {
  readonly status: "passed" | "failed" | "inconclusive" | "cancelled";
  readonly detail: string;
}

function checkBytes(actual: ArrayLike<number>, expected: readonly number[]): void {
  if (actual.length !== expected.length || expected.some((byte, index) => actual[index] !== byte)) {
    throw new Error("The received bytes differ from the fixture.");
  }
}

async function checkTransfer(client: ReviewClient): Promise<void> {
  const bytes = new Uint8Array(sample);
  const result = await client.call.moveBytes([withTransfer(bytes, [bytes.buffer])]);
  checkBytes(result, [...sample].reverse());
  if (bytes.buffer.byteLength !== 0) {
    throw new Error("The request buffer remained attached at the host.");
  }
  if (await client.call.movedResultLength() !== 0) {
    throw new Error("The result buffer remained attached in the Worker.");
  }
}

async function checkStream(client: ReviewClient, connection: ReviewConnection): Promise<void> {
  const input = new Blob([new Uint8Array(sample)]);
  const port = await client.call.openStream([input]);
  try {
    const stream = readWorkerStream({
      port,
      maxChunkBytes: chunkBytes,
      signal: connection.signal,
      budget: createWorkerStreamBudget(chunkBytes),
    });
    let offset = 0;
    for await (const chunk of stream) {
      if (typeof chunk === "string" || offset >= input.size) {
        throw new Error("The stream returned an unexpected chunk.");
      }
      checkBytes(chunk, sample.slice(offset, offset + chunkBytes));
      offset += chunk.length;
      if (offset === chunkBytes && await client.call.size([input]) !== input.size) {
        throw new Error("The unary call between stream pulls returned the wrong size.");
      }
    }
    if (offset !== input.size) {
      throw new Error("The stream ended before delivering all fixture bytes.");
    }
  } finally {
    port.close();
  }
}

/** Runs the Worker review with a fresh, owned pool and synthetic data. */
export async function runWorkerRpcReview(signal: AbortSignal): Promise<ReviewResult> {
  if (signal.aborted) {
    return cancelled;
  }
  if (typeof Worker !== "function" || typeof MessageChannel !== "function" ||
    typeof URL.createObjectURL !== "function") {
    return {
      status: "inconclusive",
      detail: "This review needs Worker, MessageChannel, and Blob URL support.",
    };
  }

  const url = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  const pool = createWorkerPool({
    size: 1,
    createConnection: () => connectWorkerRpc({ contract, createWorker: () => new Worker(url) }),
  });
  const onUnload = () => pool.close(new RpcError("disconnected", cancelled.detail));
  signal.addEventListener("abort", onUnload, { once: true });
  const timeout = window.setTimeout(() => {
    pool.close(new RpcError("timeout", "The Worker review reached its deadline."));
  }, reviewTimeoutMs);
  let step = "Worker startup";
  try {
    const [prewarmed] = await pool.start();
    const { client, connection, release } = await pool.acquire();
    try {
      if (connection !== prewarmed) {
        throw new Error("The pool did not lease its prewarmed Worker.");
      }
      step = "RPC buffer transfer";
      await checkTransfer(client);
      step = "Dedicated-port stream";
      await checkStream(client, connection);
      step = "Worker shutdown";
      const reason: unknown = await client.call.stop().catch((error: unknown) => error);
      if (!(reason instanceof RpcError) || reason.code !== "disconnected" ||
        reason.message !== stoppedMessage || !connection.signal.aborted) {
        throw new Error("The pending RPC did not receive the Worker's shutdown reason.");
      }
    } finally {
      release();
    }

    step = "Replacement Worker";
    const replacement = await pool.acquire();
    try {
      if (replacement.connection === connection ||
        await replacement.client.call.size([new Blob(["ready"])]) !== 5) {
        throw new Error("The pool did not provide a working replacement.");
      }
    } finally {
      replacement.release();
    }
    return {
      status: "passed",
      detail: "Prewarm, detached request and result buffers, streamed bytes, and Worker replacement passed.",
    };
  } catch (error) {
    if (signal.aborted) {
      return cancelled;
    }
    const reason = error instanceof Error ? error.message : String(error);
    return { status: "failed", detail: `${step} failed. ${reason}` };
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener("abort", onUnload);
    pool.close();
    URL.revokeObjectURL(url);
  }
}
