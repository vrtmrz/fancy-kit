import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';

/**
 * NamedInstance is a utility class that enables us to create and manage instances of a given type, each identified by a name.
 * This is useful in scenarios where singleton-like behaviour is required for named instances.
 *
 * Note: All properties prefixed with `_` are intended to be private, but are exposed for performance reasons. We should not access them directly.
 */
class NamedInstance {
    /**
     * @param name The name of the instance type, used for logging and debugging.
     * @param factory A factory function that creates instances of the specified type.
     */
    constructor(name, factory) {
        Object.defineProperty(this, "_name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_instances", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "_factory", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_wrap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (instance) => instance
        });
        Object.defineProperty(this, "_get", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (instanceName) => this._getInternal(instanceName)
        });
        Object.defineProperty(this, "_getInternal", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (instanceName) => this._instances.get(instanceName)
        });
        this._factory = factory;
        this._name = name;
    }
    /**
     * Returns an instance named `instanceName`. If the instance already exists, the existing instance is returned.
     * If it does not exist, a new instance is created using the factory function provided in the constructor.
     * @param instanceName The name of the instance to retrieve or create.
     * @returns {T} An instance of the specified type.
     */
    of(instanceName) {
        const instance = this._get(instanceName);
        if (instance) {
            return instance;
        }
        try {
            const instance = this._factory(instanceName);
            this._instances.set(instanceName, this._wrap(instance));
            return instance;
        }
        catch (e) {
            Logger(`Error creating instance for ${this._name} with name ${instanceName}:`, LOG_LEVEL_VERBOSE);
            Logger(e, LOG_LEVEL_VERBOSE);
            throw e;
        }
    }
    /**
     * Disposes of the instance with the given name, if it exists.
     * @param instanceName The name of the instance to dispose.
     */
    dispose(instanceName) {
        if (this._instances.has(instanceName)) {
            this._instances.delete(instanceName);
        }
    }
}
/**
 * WeakNamedInstance is a variant of NamedInstance that stores instances as weak references.
 * This allows instances to be garbage collected when there are no other strong references.
 */
class WeakNamedInstance extends NamedInstance {
    constructor() {
        super(...arguments);
        // Override the wrap method to create a WeakRef instead of a direct reference.
        Object.defineProperty(this, "_wrap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (instance) => new WeakRef(instance)
        });
        // Override the internal get method to handle weak references.
        Object.defineProperty(this, "_get", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (instanceName) => {
                const weakRef = this._getInternal(instanceName);
                if (weakRef) {
                    const instance = weakRef.deref();
                    if (instance) {
                        return instance;
                    }
                    this._instances.delete(instanceName);
                    return undefined;
                }
                return undefined;
            }
        });
    }
}

export { NamedInstance, WeakNamedInstance };
//# sourceMappingURL=NamedInstance.js.map
