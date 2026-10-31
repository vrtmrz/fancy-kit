export { encodeBinaryEach, _encodeBinary } from "./encodedUTF16.deprecated.ts";
/** Decodes ordered legacy UTF-16 parts into their original bytes. */
export declare function decodeToArrayBuffer(src: string[]): ArrayBuffer;
/** Decodes one legacy UTF-16 part into its original bytes. */
export declare function _decodeToArrayBuffer(src: string): ArrayBuffer;
