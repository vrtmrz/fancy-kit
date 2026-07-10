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
function toArrayBuffer(source) {
    if (!ArrayBuffer.isView(source))
        return source;
    const { buffer, byteOffset, byteLength } = source;
    if (buffer instanceof ArrayBuffer && byteOffset === 0 && byteLength === buffer.byteLength) {
        return buffer;
    }
    return new Uint8Array(buffer, byteOffset, byteLength).slice().buffer;
}

export { toArrayBuffer };
//# sourceMappingURL=arrayBuffer.js.map
