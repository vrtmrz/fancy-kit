import { describe, expect, it } from "vitest";
import { ValueStoreError, type ValueStoreErrorCode } from "../src/errors.js";
import { sanitiseSqliteError } from "../src/sqlite/errors.js";

describe("SQLite error boundary", () => {
  const cases: [object, ValueStoreErrorCode][] = [
    [{ code: "EACCES" }, "access-denied"], [{ code: "EPERM" }, "access-denied"],
    [{ code: "ENOSPC" }, "quota-exceeded"], [{ code: "EDQUOT" }, "quota-exceeded"],
    [{ code: "ENOENT" }, "unavailable"], [{ code: "ERR_INVALID_STATE" }, "unavailable"],
    [{ code: "ELOOP" }, "invalid-data"], [{ code: "EISDIR" }, "invalid-data"], [{ code: "ENOTDIR" }, "invalid-data"],
    [{ errcode: 3 }, "access-denied"], [{ errcode: 8 }, "access-denied"], [{ errcode: 8 | 0x100 }, "access-denied"],
    [{ errcode: 13 }, "quota-exceeded"], [{ errcode: 11 }, "invalid-data"], [{ errcode: 26 }, "invalid-data"],
    [{ errcode: 5 }, "operation-failed"], [{ errcode: 14 }, "operation-failed"],
  ];
  it.each(cases)("reports established category for %j without exposing native diagnostics", (input, expected) => {
    const error = sanitiseSqliteError(Object.assign(new Error("private SQL path and value"), input, { cause: new Error("private-cause") }));
    expect(error).toBeInstanceOf(ValueStoreError);
    expect(error.code).toBe(expected);
    expect(error.message).toBe(new ValueStoreError(expected).message);
    expect(error).not.toHaveProperty("cause");
    expect(error).not.toHaveProperty("errcode");
  });
  it("contains throwing native code accessors and retains fixed store errors", () => {
    const input = Object.defineProperty({}, "code", { get() { throw new Error("private"); } });
    expect(sanitiseSqliteError(input)).toMatchObject({ code: "operation-failed" });
    const error = new ValueStoreError("invalid-data");
    expect(sanitiseSqliteError(error)).toMatchObject({ code: "invalid-data", message: error.message });
  });
});
