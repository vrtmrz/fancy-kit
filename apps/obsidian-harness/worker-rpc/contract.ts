import { call, defineContract } from "@vrtmrz/rpc";
import type { WorkerStreamPort } from "@vrtmrz/rpc/worker";

export const chunkBytes = 4;
export const stoppedMessage = "The review Worker stopped.";
export const contract = defineContract({
  size: call<[input: Blob], number>(),
  moveBytes: call<[bytes: Uint8Array<ArrayBuffer>], Uint8Array<ArrayBuffer>>()
    .transfer({ input: "required", result: "required" }),
  movedResultLength: call<[], number>(),
  openStream: call<[input: Blob], WorkerStreamPort>().transfer({ result: "required" }),
  stop: call<[], void>(),
});
