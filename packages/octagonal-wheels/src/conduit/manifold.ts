import { LOG_LEVEL_VERBOSE, Logger } from "../common/logger.ts";
import { NamedInstance } from "./NamedInstance.ts";

/*
 * Manifold
 */
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
/**
 * Create a manifold (Internal)
 * @param name The name of the manifold
 * @returns A manifold
 * @remarks A manifold is a collection of functions that can be added, removed to invoke them with a set of arguments
 */
function createManifold<T extends any[]>(name: string): Manifold<T> {
    const functions = new Set<ManifoldFunc<T>>();
    const add = (func: ManifoldFunc<T>) => {
        functions.add(func);
    };
    const remove = (func: ManifoldFunc<T>) => {
        functions.delete(func);
    };
    const clear = () => {
        functions.clear();
    };
    const set = (func: ManifoldFunc<T>) => {
        functions.clear();
        functions.add(func);
    };
    const some = async (...args: T) => {
        if (functions.size === 0) {
            return false;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (result) {
                    return true;
                }
            } catch (e) {
                Logger(`[Manifold](${name}.some) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        }
        return false;
    };
    const any = async (...args: T) => {
        if (functions.size === 0) {
            return true;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (result) {
                    return true;
                }
            } catch (e) {
                Logger(`[Manifold](${name}.any) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        }
        return false;
    };
    const every = async (...args: T) => {
        if (functions.size === 0) {
            return true;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (!result) {
                    return false;
                }
            } catch (e) {
                Logger(`[Manifold](${name}.every) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
                return false;
            }
        }
        return true;
    };
    const all = async (...args: T) => {
        if (functions.size === 0) {
            return false;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (!result) {
                    return false;
                }
            } catch (e) {
                Logger(`[Manifold](${name}.all) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
                return false;
            }
        }
        return true;
    };
    return {
        add,
        remove,
        clear,
        set,
        some,
        any,
        every,
        all,
    };
}

export const manifold = new NamedInstance<Manifold<any>>(`Manifolds`, (e) => createManifold(e));
export const Manifold = {
    of: <T extends any[]>(name: string): Manifold<T> => {
        return manifold.of(name);
    },
};
