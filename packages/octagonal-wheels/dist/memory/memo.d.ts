export declare function memoWithMap<T extends any[], TResult>(bufferLength: number, fn: (...args: T) => Promise<TResult>, keyFunction?: (args: T) => string): (...args: T) => Promise<TResult>;
