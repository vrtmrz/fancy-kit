function valueView(parent, value, defer) {
    const view = Object.create(parent);
    Object.defineProperty(view, "value", { value, enumerable: true });
    if (defer !== undefined) {
        Object.defineProperty(view, "defer", { value: defer, enumerable: true });
    }
    return view;
}
async function runScope(parent, value, operation) {
    let state = "running";
    const cleanup = [];
    const failures = [];
    let result;
    const context = valueView(parent, value, (callback) => {
        if (state !== "running")
            throw new Error("The execution scope is already closing or closed.");
        if (typeof callback !== "function")
            throw new TypeError("Scope cleanup must be a function.");
        cleanup.push(callback);
    });
    try {
        result = await operation(context);
    }
    catch (error) {
        failures.push(error);
    }
    state = "closing";
    try {
        while (cleanup.length > 0) {
            const release = cleanup.pop();
            try {
                await release();
            }
            catch (error) {
                failures.push(error);
            }
        }
    }
    finally {
        state = "closed";
        cleanup.length = 0;
    }
    if (failures.length === 1)
        throw failures[0];
    if (failures.length > 1)
        throw new AggregateError(failures, "Multiple failures occurred in the execution scope.");
    return result;
}
/**
 * Runs one operation and awaits all of its registered cleanup before settling.
 *
 * @param value - A borrowed value, passed without cloning or automatic disposal.
 * @param operation - Receives a fresh scope and may return a value, promise, or thenable.
 * @returns The operation's result after cleanup finishes.
 * @throws The original failure when only the operation or one cleanup fails. Multiple
 * failures produce an AggregateError, with the operation failure first and cleanup
 * failures following in execution order. Failure values, including undefined, are preserved.
 * @remarks
 * Cleanup runs in reverse registration order on success, early return, and failure.
 * Returning an owned resource does not transfer ownership: its registered cleanup still runs.
 * Callers must await or return the work they start; detached promises are not discovered.
 * The scope reads no host globals and has no implicit cancellation behaviour.
 */
function withScope(value, operation) {
    return runScope({}, value, operation);
}
function programWithSteps(steps) {
    const execute = async (context) => {
        let value = context.value;
        for (const step of steps) {
            value = step.child
                ? await runScope(context, value, step.operation)
                : await step.operation(valueView(context, value));
        }
        return value;
    };
    const append = (step, child) => programWithSteps([
        ...steps,
        // The public pipe signature checks this boundary before values are erased for execution.
        { child, operation: step },
    ]);
    return Object.assign(execute, {
        pipe: (step) => append(step, false),
        pipeScoped: (step) => append(step, true),
    });
}
/**
 * Declares an identity program which can be extended with typed steps.
 *
 * @typeParam I - The value supplied when the program is executed.
 * @typeParam E - Capabilities required from the execution context; declaration does not create them.
 * @returns A callable program with immutable pipe and pipeScoped composition methods.
 * @remarks
 * pipe shares the current cleanup owner. pipeScoped owns cleanup for its step and
 * awaits that cleanup before the next step. Every step receives a stable value view;
 * its result becomes the next value without implicit merging. Undefined is ordinary
 * data, and cancellation observation does not automatically skip steps. Rejected
 * steps skip later steps, leaving the runner to perform the current scope's cleanup.
 * Declaration and composition acquire no resources and start no asynchronous work.
 */
function scoped() {
    return programWithSteps([]);
}

export { scoped, withScope };
//# sourceMappingURL=scope.js.map
