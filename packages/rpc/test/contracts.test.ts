import { describe, expect, it } from "vitest";
import {
  call,
  defineContract,
  isWithTransfer,
  notify,
  pickContract,
  RpcError,
  serialiseRpcError,
  withTransfer,
  type RpcMethodDescriptor,
} from "../src/index.js";

describe("RPC contracts and transfer descriptors", () => {
  it("builds immutable call and notify descriptors with transfer refinement", () => {
    const baseCall = call<[Uint8Array], Uint8Array>();
    const transferCall = baseCall.transfer({ input: "required", result: "optional" });
    const baseNotify = notify<[string]>();
    const transferNotify = baseNotify.transfer({ input: "required" });

    expect(baseCall.kind).toBe("call");
    expect(baseCall.inputTransfer).toBe("none");
    expect(baseCall.outputTransfer).toBe("none");

    expect(transferCall.kind).toBe("call");
    expect(transferCall.inputTransfer).toBe("required");
    expect(transferCall.outputTransfer).toBe("optional");

    expect(baseNotify.kind).toBe("notify");
    expect(baseNotify.inputTransfer).toBe("none");
    expect(transferNotify.inputTransfer).toBe("required");
    expect(transferNotify.outputTransfer).toBe("none");

    expect(Object.isFrozen(baseCall)).toBe(true);
    expect(Object.isFrozen(transferCall)).toBe(true);
    expect(Object.isFrozen(transferNotify)).toBe(true);
  });

  it("picks an exact subset of methods and rejects unknown keys", () => {
    const full = defineContract({
      encrypt: call<[Uint8Array, string], Uint8Array>(),
      ping: notify<[number]>(),
      hashBinary: call<[Uint8Array], Uint8Array>().transfer({
        input: "required",
        result: "required",
      }),
    });

    const subset = pickContract(full, ["encrypt", "ping"]);

    expect(Object.keys(subset)).toEqual(["encrypt", "ping"]);
    expect(subset.encrypt).toBe(full.encrypt);
    expect(subset.ping).toBe(full.ping);
    expect(Object.isFrozen(subset)).toBe(true);

    expect(() => pickContract(full, ["nonExistent" as keyof typeof full])).toThrow(TypeError);
  });

  it("preserves a method named __proto__ as an own property in defineContract and pickContract", () => {
    const protoDescriptor = call<[string], string>();
    const base: Record<string, RpcMethodDescriptor> = {
      safe: call<[], void>(),
    };
    const raw = Object.defineProperty(base, "__proto__", {
      value: protoDescriptor,
      enumerable: true,
      writable: true,
      configurable: true,
    });

    const defined = defineContract(raw);
    expect(Object.keys(defined)).toContain("__proto__");
    expect(Object.prototype.hasOwnProperty.call(defined, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(defined, "__proto__")?.value).toBe(protoDescriptor);

    const picked = pickContract(defined, ["__proto__"]);
    expect(Object.keys(picked)).toEqual(["__proto__"]);
    expect(Object.prototype.hasOwnProperty.call(picked, "__proto__")).toBe(true);
    expect(Object.getOwnPropertyDescriptor(picked, "__proto__")?.value).toBe(protoDescriptor);
  });

  it("creates immutable transfer descriptors without detaching buffers", () => {
    const buffer = new ArrayBuffer(16);
    const bytes = new Uint8Array(buffer);
    bytes[0] = 42;

    const wrapped = withTransfer(bytes, [buffer]);

    expect(isWithTransfer(wrapped)).toBe(true);
    expect(isWithTransfer({ value: bytes, resources: [buffer] })).toBe(false);
    expect(isWithTransfer(null)).toBe(false);
    expect(wrapped.value).toBe(bytes);
    expect(wrapped.resources).toEqual([buffer]);
    expect(buffer.byteLength).toBe(16);
    expect(bytes[0]).toBe(42);
    expect(Object.isFrozen(wrapped)).toBe(true);
    expect(Object.isFrozen(wrapped.resources)).toBe(true);
  });
});

describe("RpcError and wire error serialisation", () => {
  it("preserves structured fields on RpcError instances", () => {
    const peer = { peerId: "worker-1", instanceId: "inst-9" };
    const cause = new Error("underlying socket reset");
    const rpcError = new RpcError("disconnected", "Peer disconnected.", {
      peer,
      cause,
    });

    expect(rpcError).toBeInstanceOf(Error);
    expect(rpcError.name).toBe("RpcError");
    expect(rpcError.code).toBe("disconnected");
    expect(rpcError.peer).toEqual(peer);
    expect(rpcError.cause).toBe(cause);
    expect(serialiseRpcError(rpcError)).toEqual({
      code: "disconnected",
      message: "Peer disconnected.",
    });
  });

  it("normalises arbitrary thrown errors without leaking local details", () => {
    const typeError = new TypeError("bad argument");
    expect(serialiseRpcError(typeError)).toEqual({
      code: "remote-error",
      message: "bad argument",
      remoteName: "TypeError",
    });

    expect(serialiseRpcError("plain string failure")).toEqual({
      code: "remote-error",
      message: "plain string failure",
    });

    expect(serialiseRpcError({ secret: "should-not-leak" })).toEqual({
      code: "remote-error",
      message: "Remote handler failed.",
    });
  });
});
