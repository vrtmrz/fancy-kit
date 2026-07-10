import { NamedInstance } from "./NamedInstance.ts";
type ManifoldFunc<T extends any[]> = (...args: T) => Promise<boolean | void | undefined>;
/**
 * Manifold
 * A manifold is a collection of functions that can be added, removed to invoke them with a set of arguments
 */
export interface Manifold<T extends any[]> {
    /**
     * Add a function to the manifold
     * @param func The function to add to the manifold
     * @returns
     */
    add: (func: ManifoldFunc<T>) => void;
    /**
     *
     * @param func The function to remove from the manifold
     * @returns
     */
    remove: (func: ManifoldFunc<T>) => void;
    /**
     * Clear all functions from the manifold
     * @returns
     */
    clear: () => void;
    /**
     *
     * @param func The function to set as the only function in the manifold
     * @remarks This will clear all other functions from the manifold
     * @returns
     */
    set: (func: ManifoldFunc<T>) => void;
    /**
     * Invoke all associated functions until one returns true
     * @param args The arguments to pass to the functions in the manifold
     * @returns if any function returns true
     * @remarks If no functions are in the manifold, this will return false
     */
    some: (...args: T) => Promise<boolean>;
    /**
     * Invoke all associated functions until one returns true
     * @param args The arguments to pass to the functions in the manifold
     * @returns if any function returns true
     * @remarks If no functions are in the manifold, this will return true
     */
    any: (...args: T) => Promise<boolean>;
    /**
     * Invoke all associated functions until one returns false
     * @param args The arguments to pass to the functions in the manifold
     * @returns if all functions return true
     * @remarks If no functions are in the manifold, this will return true
     */
    every: (...args: T) => Promise<boolean>;
    /**
     * Invoke all associated functions until one returns false
     * @param args The arguments to pass to the functions in the manifold
     * @returns if all functions return true
     * @remarks If no functions are in the manifold, this will return false
     */
    all: (...args: T) => Promise<boolean>;
}
export declare const manifold: NamedInstance<Manifold<any>, Manifold<any>>;
export declare const Manifold: {
    of: <T extends any[]>(name: string) => Manifold<T>;
};
export {};
