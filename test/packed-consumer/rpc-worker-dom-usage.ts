import { call, defineContract } from "@vrtmrz/rpc";
import {
  connectWorkerRpc,
  type WorkerTransferPort,
} from "@vrtmrz/rpc/worker";

const contract = defineContract({
  openPort: call<[], MessagePort>().transfer({ result: "required" }),
});

export async function connectNativeWorkerAndUsePort(): Promise<string> {
  const worker = new Worker(
    new URL("./rpc-browser-worker.mjs", import.meta.url),
    { type: "module" },
  );
  const connection = connectWorkerRpc({ contract, createWorker: () => worker });
  let port: MessagePort | undefined;
  try {
    const client = await connection.ready;
    port = await client.call.openPort();
    const transferablePort: WorkerTransferPort = port;
    void transferablePort;
    const received = await new Promise<string>((resolve, reject) => {
      const onMessage = (event: MessageEvent<unknown>) => {
        port?.removeEventListener("message", onMessage);
        if (typeof event.data !== "string") {
          reject(new TypeError("Worker port returned a non-string value."));
          return;
        }
        resolve(event.data);
      };
      port?.addEventListener("message", onMessage);
      port?.start();
      port?.postMessage("packed-consumer");
    });
    if (received !== "packed-consumer") {
      throw new Error("Worker port returned an unexpected value.");
    }
    return received;
  } finally {
    port?.close();
    connection.close();
  }
}

// @ts-expect-error The DOM Worker example does not require Node ambient types.
type NoImplicitNode = NodeJS.Timeout;

export type { NoImplicitNode };
