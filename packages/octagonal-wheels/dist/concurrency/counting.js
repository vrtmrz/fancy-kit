/**
 * Counts an operation until its result or thenable settles.
 *
 * Incrementing succeeds before the operation starts. The operation's result or
 * failure is preserved, and the count is decremented in finally. Accessor
 * failures propagate; a decrement failure takes precedence over an operation
 * failure, following ordinary finally semantics. The caller chooses whether
 * the scope includes waiting, processing, or both.
 */
async function withCounting(counter, operation) {
    counter.value++;
    try {
        return await operation();
    }
    finally {
        counter.value--;
    }
}

export { withCounting };
//# sourceMappingURL=counting.js.map
