/**
 * Creates a read, decode, compare, and write sequence for applying content.
 * Read failures alone invoke `adapter.onReadError`; fallback, decode, comparison, and write failures reject.
 * Each callback may return a value or a promise-like result and completes before the next starts.
 * A true comparison skips writing; otherwise the returned promise resolves to `changed` only
 * after the write completes. All callbacks receive the original target or source where declared.
 *
 * Each invocation runs independently. The factory adds no locking, retries, rollback, cloning,
 * or persistence; the adapter owns storage and comparison policy, including read-error recovery.
 *
 * @param adapter - Operations retained by reference for every invocation.
 * @returns An asynchronous function which applies one source to one target.
 */
function createContentApplier(adapter) {
    return async (target, source) => {
        let existing;
        try {
            existing = await adapter.read(target, source);
        }
        catch (error) {
            existing = await adapter.onReadError(error, target, source);
        }
        const content = await adapter.decode(source);
        if (await adapter.isSame(existing, content, target, source)) {
            return "unchanged";
        }
        await adapter.write(target, content, source);
        return "changed";
    };
}

export { createContentApplier };
//# sourceMappingURL=content.js.map
