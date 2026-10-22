import { constants, type BigIntStats } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import type { ValueDeleter, ValueStore } from "../contracts.js";
import { createDeletableValueStore } from "../store.js";
import { ValueStoreError, sanitiseValueStoreError } from "../errors.js";
import { validateValueKey, validateValuePrefix, validateValueString } from "../validation.js";
import { decodeDocument, encodeDocument, MAX_DOCUMENT_BYTES } from "./format.js";
import type { JsonFileOperations } from "./operations.js";
import type { JsonFileValueStoreOptions } from "./types.js";

function codeOf(error: unknown): unknown {
  try { return (error as { code?: unknown } | null)?.code; } catch { return undefined; }
}

function sanitiseFileError(error: unknown): ValueStoreError {
  switch (codeOf(error)) {
    case "ENOENT": return new ValueStoreError("unavailable");
    case "EACCES":
    case "EPERM": return new ValueStoreError("access-denied");
    case "ENOSPC":
    case "EDQUOT": return new ValueStoreError("quota-exceeded");
    case "ELOOP":
    case "EISDIR":
    case "ENOTDIR": return new ValueStoreError("invalid-data");
    default: return sanitiseValueStoreError(error);
  }
}

function sameFile(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function regularFile(stat: BigIntStats, allowUnlinked = false): void {
  if (!stat.isFile() || stat.nlink > 1n || (stat.nlink === 0n && !allowUnlinked)) {
    throw new ValueStoreError("invalid-data");
  }
}

/** Private injected constructor; the public entry uses only real Node I/O. */
export function createJsonFileValueStoreWithOperations(options: JsonFileValueStoreOptions, operations: JsonFileOperations): ValueStore & ValueDeleter {
  try {
    const prefix = options?.prefix;
    validateValuePrefix(prefix);
    const suppliedPath = options?.filePath;
    if (typeof suppliedPath !== "string" || suppliedPath.length === 0 || suppliedPath.includes("\0")) {
      throw new ValueStoreError("invalid-value");
    }
    const filePath = resolve(suppliedPath);
    const parent = dirname(filePath);
    let fileSeen = false;

    function validateParent(): void {
      const current = operations.statDirectory(parent);
      if (!current.isDirectory() || !sameFile(current, originalParent)) throw new ValueStoreError("unavailable");
    }

    function inspectEntry(): BigIntStats | null {
      try {
        const stat = operations.statPath(filePath);
        regularFile(stat);
        return stat;
      } catch (error) {
        if (codeOf(error) === "ENOENT" && !fileSeen) return null;
        throw error;
      }
    }

    function readEntries(): Map<string, string> {
      validateParent();
      const pathStat = inspectEntry();
      if (pathStat === null) {
        validateParent();
        return new Map();
      }
      if (pathStat.size > BigInt(MAX_DOCUMENT_BYTES)) throw new ValueStoreError("invalid-data");
      const descriptor = operations.open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
      let bytes: Uint8Array;
      try {
        const stat = operations.statDescriptor(descriptor);
        regularFile(stat, true);
        if (stat.size < 0n || stat.size > BigInt(MAX_DOCUMENT_BYTES)) throw new ValueStoreError("invalid-data");
        const length = Number(stat.size);
        const buffer = new Uint8Array(length + 1);
        let offset = 0;
        while (offset < buffer.length) {
          const count = operations.read(descriptor, buffer, offset, buffer.length - offset, offset);
          if (count === 0) break;
          offset += count;
        }
        if (offset !== length) throw new ValueStoreError("invalid-data");
        const after = operations.statDescriptor(descriptor);
        regularFile(after, true);
        if (after.size !== stat.size) throw new ValueStoreError("invalid-data");
        bytes = buffer.subarray(0, offset);
      } finally {
        operations.close(descriptor);
      }
      validateParent();
      const entries = decodeDocument(bytes);
      fileSeen = true;
      return entries;
    }

    function cleanup(path: string, identity: BigIntStats): void {
      validateParent();
      let current: BigIntStats;
      try { current = operations.statPath(path); }
      catch (error) { if (codeOf(error) === "ENOENT") return; throw error; }
      if (!current.isFile() || current.nlink !== 1n || !sameFile(current, identity)) throw new ValueStoreError("operation-failed");
      operations.unlink(path);
    }

    function replace(entries: Map<string, string>): void {
      const bytes = encodeDocument(entries);
      let temporaryPath: string | undefined;
      let temporaryIdentity: BigIntStats | undefined;
      let replacementStarted = false;
      try {
        validateParent();
        inspectEntry();
        const candidate = join(parent, `.value-store-${randomUUID()}.tmp`);
        const descriptor = operations.open(candidate, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
        temporaryPath = candidate;
        try {
          temporaryIdentity = operations.statDescriptor(descriptor);
          regularFile(temporaryIdentity);
          let offset = 0;
          while (offset < bytes.length) {
            const count = operations.write(descriptor, bytes, offset, bytes.length - offset, offset);
            if (count <= 0) throw new ValueStoreError("operation-failed");
            offset += count;
          }
          operations.sync(descriptor);
        } finally {
          operations.close(descriptor);
        }
        validateParent();
        inspectEntry();
        const currentTemporary = operations.statPath(candidate);
        regularFile(currentTemporary);
        if (!sameFile(currentTemporary, temporaryIdentity)) throw new ValueStoreError("operation-failed");
        replacementStarted = true;
        operations.rename(candidate, filePath);
        temporaryPath = undefined;
        fileSeen = true;
        validateParent();
      } catch (error) {
        throw replacementStarted ? new ValueStoreError("operation-failed") : sanitiseFileError(error);
      } finally {
        // Retain an artefact whose descriptor could not establish ownership.
        if (temporaryPath !== undefined && temporaryIdentity !== undefined) {
          try { cleanup(temporaryPath, temporaryIdentity); }
          catch (error) { throw replacementStarted ? new ValueStoreError("operation-failed") : sanitiseFileError(error); }
        }
      }
    }

    const store = createDeletableValueStore({
      get(key) {
        try {
          validateValueKey(key);
          return readEntries().get(prefix + key) ?? null;
        } catch (error) { throw sanitiseFileError(error); }
      },
      set(key, value) {
        try {
          validateValueKey(key);
          validateValueString(value);
          if (prefix.length + key.length > MAX_DOCUMENT_BYTES) throw new ValueStoreError("quota-exceeded");
          const entries = readEntries();
          entries.set(prefix + key, value);
          replace(entries);
        } catch (error) { throw sanitiseFileError(error); }
      },
      delete(key) {
        try {
          validateValueKey(key);
          const entries = readEntries();
          if (entries.delete(prefix + key)) replace(entries);
        } catch (error) { throw sanitiseFileError(error); }
      },
    }, options);
    const originalParent = operations.statDirectory(parent);
    if (!originalParent.isDirectory()) throw new ValueStoreError("invalid-data");
    readEntries();
    return store;
  } catch (error) { throw sanitiseFileError(error); }
}
