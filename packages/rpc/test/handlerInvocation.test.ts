import { describe, expect, it, vi } from "vitest";
import { invokeHandler } from "../src/endpoint/inboundOperations.invokeHandler.js";

describe("handler invocation timing", () => {
  it("completes a synchronous result before returning", () => {
    const order: unknown[] = [];
    invokeHandler(
      () => 42,
      (value) => order.push(value),
      (error) => order.push(error),
    );
    order.push("returned");
    expect(order).toEqual([42, "returned"]);
  });

  it("reports synchronous invocation and completion failures immediately", () => {
    const error = new Error("failure");
    const failure = vi.fn();
    invokeHandler(
      () => {
        throw error;
      },
      vi.fn(),
      failure,
    );
    invokeHandler(
      () => 42,
      () => {
        throw error;
      },
      failure,
    );
    expect(failure.mock.calls).toEqual([[error], [error]]);
  });

  it("observes asynchronous success and rejection after returning", async () => {
    const success = vi.fn();
    const failure = vi.fn();
    const error = new Error("failure");
    invokeHandler(() => Promise.resolve(42), success, failure);
    invokeHandler(() => Promise.reject(error), success, failure);
    expect(success).not.toHaveBeenCalled();
    expect(failure).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(success).toHaveBeenCalledExactlyOnceWith(42);
    expect(failure).toHaveBeenCalledExactlyOnceWith(error);
  });
});
