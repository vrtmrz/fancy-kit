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
export declare function bindContext<T extends any[], U extends any | Promise<any>, Context>(ctx: Context, func: (ctx: Context, ...args: T) => U): (...args: T) => U;
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
export declare function bindContextFunc<T extends any[], U, Context>(ctxFun: () => Context, func: (ctx: Context, ...args: T) => U): (...args: T) => U;
