import { expect, it, vi } from "vitest";
import { sanitiseValueStoreError, ValueStoreError } from "../src/index.js";

it("does not execute an error code accessor while sanitising a failure", () => {
  const readCode = vi.fn(() => "unavailable");
  const error = new ValueStoreError("unavailable");
  Object.defineProperty(error, "code", { get: readCode });

  const sanitised = sanitiseValueStoreError(error);

  expect(readCode).not.toHaveBeenCalled();
  expect(sanitised.code).toBe("operation-failed");
  expect(sanitised).not.toBe(error);
  expect(Object.hasOwn(sanitised, "cause")).toBe(false);
});
