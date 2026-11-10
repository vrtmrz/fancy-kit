import { ValueStoreError, sanitiseValueStoreError } from "../errors.js";

/**
 * Maps only established native categories; never copies diagnostic text.
 * Busy, locked, and unclassified SQLite failures remain operation-failed without retry.
 */
export function sanitiseSqliteError(error: unknown): ValueStoreError {
  let code: unknown;
  let sqliteCode: unknown;
  try {
    code = (error as { code?: unknown } | null)?.code;
    sqliteCode = (error as { errcode?: unknown } | null)?.errcode;
  } catch { return new ValueStoreError("operation-failed"); }
  if (code === "EACCES" || code === "EPERM") return new ValueStoreError("access-denied");
  if (code === "ENOSPC" || code === "EDQUOT") return new ValueStoreError("quota-exceeded");
  if (code === "ENOENT" || code === "ERR_INVALID_STATE") return new ValueStoreError("unavailable");
  if (code === "ELOOP" || code === "EISDIR" || code === "ENOTDIR") return new ValueStoreError("invalid-data");
  if (typeof sqliteCode === "number") {
    switch (sqliteCode & 255) {
      case 3: // SQLITE_PERM
      case 8: return new ValueStoreError("access-denied"); // SQLITE_READONLY
      case 13: return new ValueStoreError("quota-exceeded"); // SQLITE_FULL
      case 11: // SQLITE_CORRUPT
      case 26: return new ValueStoreError("invalid-data"); // SQLITE_NOTADB
    }
  }
  return sanitiseValueStoreError(error);
}
