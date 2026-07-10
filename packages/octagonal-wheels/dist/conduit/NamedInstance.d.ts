/**
 * NamedInstance is a utility class that enables us to create and manage instances of a given type, each identified by a name.
 * This is useful in scenarios where singleton-like behaviour is required for named instances.
 *
 * Note: All properties prefixed with `_` are intended to be private, but are exposed for performance reasons. We should not access them directly.
 */
export declare class NamedInstance<T, U = T> {
    _name: string;
    _instances: Map<string, U>;
    _factory: (name: string) => T;
    _wrap: (instance: T) => U;
    _get: (instanceName: string) => T | undefined;
    _getInternal: (instanceName: string) => U | undefined;
    /**
     * @param name The name of the instance type, used for logging and debugging.
     * @param factory A factory function that creates instances of the specified type.
     */
    constructor(name: string, factory: (name: string) => T);
    /**
     * Returns an instance named `instanceName`. If the instance already exists, the existing instance is returned.
     * If it does not exist, a new instance is created using the factory function provided in the constructor.
     * @param instanceName The name of the instance to retrieve or create.
     * @returns {T} An instance of the specified type.
     */
    of<V extends T>(instanceName: string): V;
    /**
     * Disposes of the instance with the given name, if it exists.
     * @param instanceName The name of the instance to dispose.
     */
    dispose(instanceName: string): void;
}
/**
 * WeakNamedInstance is a variant of NamedInstance that stores instances as weak references.
 * This allows instances to be garbage collected when there are no other strong references.
 */
export declare class WeakNamedInstance<T extends object> extends NamedInstance<T, WeakRef<T>> {
    _wrap: (instance: T) => WeakRef<T>;
    _get: (instanceName: string) => T | undefined;
}
