import { ValueStoreError } from "../errors.js";

/**
 * Encodes JavaScript UTF-16 code units as big-endian bytes, independently of the
 * caller's serialiser. This preserves embedded NULs and lone surrogates in SQLite BLOBs.
 */
export function encodeString(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length * 2);
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    bytes[index * 2] = unit >>> 8;
    bytes[index * 2 + 1] = unit & 255;
  }
  return bytes;
}

/** Compares unsigned bytes in the same lexicographic order SQLite uses for BLOBs. */
export function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

/** Returns the exclusive byte ceiling for all BLOBs beginning with `bytes`. */
export function nextBlobPrefix(bytes: Uint8Array): Uint8Array | undefined {
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    if (bytes[index] < 0xff) {
      const next = bytes.slice(0, index + 1);
      next[index] += 1;
      return next;
    }
  }
  return undefined;
}

/** Requires an even-length BLOB so native TEXT or truncated code units cannot be decoded silently. */
export function decodeString(value: unknown): string {
  if (!(value instanceof Uint8Array) || value.length % 2 !== 0) throw new ValueStoreError("invalid-data");
  let text = "";
  // Spread at most 4,096 code units per call to stay below engine argument limits.
  for (let offset = 0; offset < value.length; offset += 8192) {
    const units: number[] = [];
    for (let index = offset; index < Math.min(offset + 8192, value.length); index += 2) {
      units.push((value[index] << 8) | value[index + 1]);
    }
    text += String.fromCharCode(...units);
  }
  return text;
}
