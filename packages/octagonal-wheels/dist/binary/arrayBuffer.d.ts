/**
 * Returns an `ArrayBuffer` containing exactly the bytes visible through the input.
 *
 * @param source - An `ArrayBuffer`, `DataView`, typed array, or Node-compatible buffer view.
 * @returns The original `ArrayBuffer` when it already represents the exact range; otherwise, an independent copy of the visible bytes.
 *
 * @remarks
 * Views with a non-zero `byteOffset`, views shorter than their backing buffer, and
 * views backed by `SharedArrayBuffer` are copied. Bytes outside the view are never
 * included, and subsequent mutations of the source do not affect a copied result.
 */
export declare function toArrayBuffer(source: ArrayBuffer | ArrayBufferView<ArrayBufferLike>): ArrayBuffer;
