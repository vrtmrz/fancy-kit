# Worker guide

The experimental `@vrtmrz/rpc/worker` entry connects a host to a dedicated
Worker. `connectWorkerRpc` takes ownership of a Worker created by the host.
Its `ready` promise resolves with the typed client after `serveWorkerRpc`
finishes registering the handlers. Close the connection when the host stops.

## Share a contract

The following example uses a pool and returns a stream of bytes from a copied
`Blob`. The contract also has a single-result call to show how both kinds of
work share a connection.

```ts
// contract.ts
import { call, defineContract } from "@vrtmrz/rpc";
import type { WorkerStreamPort } from "@vrtmrz/rpc/worker";

export const chunkBytes = 64 * 1024;
export const contract = defineContract({
  length: call<[input: Blob], number>(),
  read: call<[input: Blob], WorkerStreamPort>().transfer({ result: "required" }),
});
```

## Register the Worker handlers

```ts
// worker.ts
import { serveWorkerRpc, serveWorkerStream } from "@vrtmrz/rpc/worker";
import { chunkBytes, contract } from "./contract.js";

serveWorkerRpc({
  contract,
  port: self,
  register(endpoint, lifetime) {
    endpoint.handle("length", (_context, input) => input.size);
    endpoint.handle("read", (_context, input) => serveWorkerStream({
      createChannel: () => new MessageChannel(),
      maxChunkBytes: chunkBytes,
      signal: lifetime,
      transferChunks: true,
      async *createSource(signal) {
        for (let offset = 0; offset < input.size && !signal.aborted; offset += chunkBytes) {
          const buffer = await input.slice(offset, offset + chunkBytes).arrayBuffer();
          if (signal.aborted) {
            return;
          }
          yield new Uint8Array(buffer);
        }
      },
    }));
  },
});
```

## Use the connection in the host

Compile the Worker with WebWorker declarations and make `worker.js` available
as a dedicated module Worker. The host uses DOM declarations.

```ts
// host.ts
import {
  connectWorkerRpc,
  createWorkerPool,
  createWorkerStreamBudget,
  readWorkerStream,
} from "@vrtmrz/rpc/worker";
import { chunkBytes, contract } from "./contract.js";

const pool = createWorkerPool({
  size: 2,
  createConnection: () => connectWorkerRpc({
    contract,
    createWorker: () => new Worker(new URL("./worker.js", import.meta.url), { type: "module" }),
  }),
});
const budget = createWorkerStreamBudget(2 * chunkBytes);

try {
  const input = new Blob(["Worker stream example"]);
  const { client, connection, release } = await pool.acquire();
  try {
    const expected = await client.call.length([input]);
    const port = await client.call.read([input]);
    try {
      const chunks = readWorkerStream({
        port,
        maxChunkBytes: chunkBytes,
        signal: connection.signal,
        budget,
      });
      let received = 0;
      for await (const chunk of chunks) {
        if (typeof chunk === "string") {
          throw new Error("Expected a binary chunk.");
        }
        received += chunk.byteLength;
      }
      if (received !== expected) {
        throw new Error("The streamed byte count changed.");
      }
    } finally {
      port.close();
    }
  } finally {
    release();
  }
} finally {
  pool.close();
}
```

For a single Worker, call `connectWorkerRpc` directly, await `connection.ready`,
and close the connection when finished. Call `pool.start()` inside the pool's
owned lifetime to start all connections before the first acquisition. The host
can then use the clients to prepare application caches. Keep a lease until the
work on that connection ends. Call its `release()` even if a handler or
consumer fails. The managed client's `dispose()` closes the connection for
every lease using it.

`readWorkerStream` requests one chunk at a time and checks its size against
`maxChunkBytes`. Pick the limit from the largest chunk your producer can emit.
Returning the iterator, including breaking out of the loop, requests producer
cancellation. Give both ends their connection signal for shutdown and failures.
The example closes the received port even if stream setup fails. The byte
budget counts pending chunk capacity shared by readers. Chunks the application
keeps after reading have their own lifetime.

The [Worker execution design](worker-execution.md) describes startup deadlines,
placement, and stream lifetimes. The [transfer profile](worker-transfer-profile.md)
defines the permitted data and ownership rules for RPC transfer lists.
