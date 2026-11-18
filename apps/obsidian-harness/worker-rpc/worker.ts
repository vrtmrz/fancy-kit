import { RpcError, withTransfer } from "@vrtmrz/rpc";
import { serveWorkerRpc, serveWorkerStream } from "@vrtmrz/rpc/worker";
import { chunkBytes, contract, stoppedMessage } from "./contract.js";

declare const self: DedicatedWorkerGlobalScope;

let movedResult: ArrayBuffer | undefined;
const server = serveWorkerRpc({
  contract,
  port: self,
  register(endpoint, signal) {
    endpoint.handle("size", (_context, input) => input.size);
    endpoint.handle("moveBytes", (_context, bytes) => {
      const result = bytes.slice().reverse();
      movedResult = result.buffer;
      return withTransfer(result, [movedResult]);
    });
    endpoint.handle("movedResultLength", () => movedResult?.byteLength ?? -1);
    endpoint.handle("openStream", (_context, input) => serveWorkerStream({
      createChannel: () => new MessageChannel(),
      maxChunkBytes: chunkBytes,
      transferChunks: true,
      signal,
      async *createSource() {
        for (let offset = 0; offset < input.size; offset += chunkBytes) {
          const chunk = new Uint8Array(await input.slice(offset, offset + chunkBytes).arrayBuffer());
          yield chunk;
          if (chunk.buffer.byteLength !== 0) {
            throw new Error("The stream chunk buffer remained attached in the Worker.");
          }
        }
      },
    }));
    endpoint.handle("stop", () => server.close(new RpcError("disconnected", stoppedMessage)));
  },
});
