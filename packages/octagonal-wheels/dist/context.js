/**
 * Binds a context object to a function, creating a new function that will invoke the original function with the provided context object.
 *
 * @param ctx - The context object to bind to the function.
 * @param func - The function to bind the context to.
 * @returns A new function that will invoke the original function with the provided context.
 * @template T - The type of the arguments of the original function.
 * @template U - The return type of the original function.
 * @template Context - The type of the context object.
 */
function bindContext(ctx, func) {
    const context = ctx;
    return (...args) => func(context, ...args);
}
/**
 * Binds a context retrieving function to a given function.
 *
 * @template T - The type of the arguments passed to the function.
 * @template U - The return type of the function.
 * @template Context - The type of the context.
 * @param ctxFun - The context function.
 * @param func - The function to bind the context to.
 * @returns A new function that calls the original function with the bound context.
 */
function bindContextFunc(ctxFun, func) {
    const context = ctxFun;
    return (...args) => func(context(), ...args);
}

export { bindContext, bindContextFunc };
//# sourceMappingURL=context.js.map
