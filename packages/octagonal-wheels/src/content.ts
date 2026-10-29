type MaybePromise<T> = T | PromiseLike<T>;

/** Resolves to `changed` after a successful write, or `unchanged` when existing content matches. */
export type ContentApplier<TTarget, TSource> = (target: TTarget, source: TSource) => Promise<"changed" | "unchanged">;

/** Injected operations and application policy for one content application. */
export type ContentApplierAdapter<TTarget, TSource, TExisting, TContent> = Readonly<{
    /** Reads the existing target. Only this callback has a recovery boundary. */
    read: (target: TTarget, source: TSource) => MaybePromise<TExisting>;
    /** Supplies existing content after a read failure, or throws to stop the operation. */
    onReadError: (error: unknown, target: TTarget, source: TSource) => MaybePromise<TExisting>;
    /** Converts the source to writable content after the read or its recovery completes. */
    decode: (source: TSource) => MaybePromise<TContent>;
    /** Returns true to leave the target unchanged and skip the write. */
    isSame: (existing: TExisting, content: TContent, target: TTarget, source: TSource) => MaybePromise<boolean>;
    /** Writes different content. Its resolved value is ignored; completion means success. */
    write: (target: TTarget, content: TContent, source: TSource) => MaybePromise<unknown>;
}>;

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
export function createContentApplier<TTarget, TSource, TExisting, TContent>(
    adapter: ContentApplierAdapter<TTarget, TSource, TExisting, TContent>
): ContentApplier<TTarget, TSource> {
    return async (target, source) => {
        let existing: TExisting;
        try {
            existing = await adapter.read(target, source);
        } catch (error) {
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
