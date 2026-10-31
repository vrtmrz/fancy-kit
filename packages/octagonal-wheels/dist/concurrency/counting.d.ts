/** A caller-owned count, including reactive values with a writable accessor. */
export interface MutableCount {
    /** The current number of operations within the counted scope. */
    value: number;
}
/**
 * Counts an operation until its result or thenable settles.
 *
 * Incrementing succeeds before the operation starts. The operation's result or
 * failure is preserved, and the count is decremented in finally. Accessor
 * failures propagate; a decrement failure takes precedence over an operation
 * failure, following ordinary finally semantics. The caller chooses whether
 * the scope includes waiting, processing, or both.
 */
export declare function withCounting<T>(counter: MutableCount, operation: () => T | PromiseLike<T>): Promise<T>;
