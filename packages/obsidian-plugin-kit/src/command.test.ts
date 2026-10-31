import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createCommandCheck } from "./command.js";

describe("createCommandCheck", () => {
  it.each([undefined, null, false, "", 0, Number.NaN])(
    "does not execute for an unavailable value %s",
    (value) => {
      const execute = vi.fn();
      const callback = createCommandCheck(() => value, execute);

      expect(callback(true)).toBe(false);
      expect(callback(false)).toBe(false);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it("passes the value selected for each invocation and skips check-only actions", () => {
    const first = { id: "first" };
    const second = { id: "second" };
    const select = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const execute = vi.fn();
    const callback = createCommandCheck(select, execute);

    expect(callback(true)).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    expect(callback(false)).toBe(true);
    expect(select).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledExactlyOnceWith(second);
  });

  it.each([true, false])("propagates selection failures while checking=%s", (checking) => {
    const failure = new Error("Selection failed");
    const execute = vi.fn();
    const callback = createCommandCheck(() => { throw failure; }, execute);
    expect(() => callback(checking)).toThrow(failure);
    expect(execute).not.toHaveBeenCalled();
  });

  it("propagates synchronous action failures", () => {
    const failure = new Error("Action failed");
    const callback = createCommandCheck(
      () => true,
      () => {
        throw failure;
      },
    );

    expect(callback(true)).toBe(true);
    expect(() => callback(false)).toThrow(failure);
  });

  it("does not await an action promise", () => {
    const pending = new Promise<void>(() => {});
    const execute = vi.fn(() => pending);
    const callback = createCommandCheck(() => "available", execute);

    expect(callback(false)).toBe(true);
    expect(execute).toHaveBeenCalledExactlyOnceWith("available");
  });

  it("keeps the action argument non-nullish and returns a boolean callback", () => {
    type Item = { id: string };
    const callback = createCommandCheck<Item | null | undefined>(
      () => undefined,
      (selected) => {
        expectTypeOf(selected).toEqualTypeOf<Item>();
      },
    );

    expectTypeOf(callback).toEqualTypeOf<(checking: boolean) => boolean>();
  });
});
