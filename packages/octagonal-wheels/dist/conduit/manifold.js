import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { NamedInstance } from './NamedInstance.js';

/**
 * Create a manifold (Internal)
 * @param name The name of the manifold
 * @returns A manifold
 * @remarks A manifold is a collection of functions that can be added, removed to invoke them with a set of arguments
 */
function createManifold(name) {
    const functions = new Set();
    const add = (func) => {
        functions.add(func);
    };
    const remove = (func) => {
        functions.delete(func);
    };
    const clear = () => {
        functions.clear();
    };
    const set = (func) => {
        functions.clear();
        functions.add(func);
    };
    const some = async (...args) => {
        if (functions.size === 0) {
            return false;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (result) {
                    return true;
                }
            }
            catch (e) {
                Logger(`[Manifold](${name}.some) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        }
        return false;
    };
    const any = async (...args) => {
        if (functions.size === 0) {
            return true;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (result) {
                    return true;
                }
            }
            catch (e) {
                Logger(`[Manifold](${name}.any) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        }
        return false;
    };
    const every = async (...args) => {
        if (functions.size === 0) {
            return true;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (!result) {
                    return false;
                }
            }
            catch (e) {
                Logger(`[Manifold](${name}.every) Error in function: ${func.name}`);
                Logger(e, LOG_LEVEL_VERBOSE);
                return false;
            }
        }
        return true;
    };
    const all = async (...args) => {
        if (functions.size === 0) {
            return false;
        }
        for (const func of functions) {
            try {
                const result = await func(...args);
                if (!result) {
                    return false;
                }
            }
            catch (e) {
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
const manifold = new NamedInstance(`Manifolds`, (e) => createManifold(e));
const Manifold = {
    of: (name) => {
        return manifold.of(name);
    },
};

export { Manifold, manifold };
//# sourceMappingURL=manifold.js.map
