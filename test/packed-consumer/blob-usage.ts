import {
  createBinaryBlob,
  createTextBlob,
  isBlobContentEqual,
  toBlob,
} from "octagonal-wheels/binary/blob";
import type { ArrayBufferContentEquality } from "octagonal-wheels/binary/blob";
import {
  isBlobContentEqual as isBlobContentEqualAlias,
  toBlob as toBlobAlias,
} from "octagonal-wheels/binary/blob.js";
import type { ArrayBufferContentEquality as ArrayBufferContentEqualityAlias } from "octagonal-wheels/binary/blob.js";
import {
  isBlobContentEqual as isBlobContentEqualFromBinary,
  toBlob as toBlobFromBinary,
} from "octagonal-wheels/binary";
import type { ArrayBufferContentEquality as ArrayBufferContentEqualityFromBinary } from "octagonal-wheels/binary";

const text: Blob = createTextBlob(["first", "second"]);
const bytes = new Uint8Array([1, 2, 3]);
const binary: Blob = createBinaryBlob(bytes);
const buffer: Blob = toBlob(bytes.buffer);
const normalised: Blob = toBlob(text);
const alias: Blob = toBlobAlias("text");
const category: Blob = toBlobFromBinary(bytes);
const isBufferContentEqual: ArrayBufferContentEquality = (left, right) => {
  if (left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  return leftBytes.every((byte, index) => byte === rightBytes[index]);
};
const isBufferContentEqualAlias: ArrayBufferContentEqualityAlias = async (
  left,
  right,
) => isBufferContentEqual(left, right);
const isBufferContentEqualFromCategory: ArrayBufferContentEqualityFromBinary =
  isBufferContentEqualAlias;
const focusedComparison: Promise<boolean> = isBlobContentEqual(
  text,
  binary,
  isBufferContentEqual,
);
const aliasComparison: Promise<boolean> = isBlobContentEqualAlias(
  binary,
  text,
  isBufferContentEqualAlias,
);
const categoryComparison: Promise<boolean> = isBlobContentEqualFromBinary(
  text,
  binary,
  isBufferContentEqualFromCategory,
);
void [
  text,
  binary,
  buffer,
  normalised,
  alias,
  category,
  focusedComparison,
  aliasComparison,
  categoryComparison,
];

// @ts-expect-error Plain objects are outside the supported conversion contract.
toBlob({ content: "text" });
// @ts-expect-error SharedArrayBuffer-backed views are outside the Blob input contract.
createBinaryBlob(new Uint8Array(new SharedArrayBuffer(4)));
// @ts-expect-error Blob comparison accepts Blob instances only.
isBlobContentEqual("text", text);
// @ts-expect-error ArrayBuffer equality predicates must return a boolean or PromiseLike<boolean>.
isBlobContentEqual(text, binary, () => 1);
