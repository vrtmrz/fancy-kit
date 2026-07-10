export interface ValueWrapper<T> {
    value: T;
}
export interface Pin<T> {
    value: T;
    release: () => void;
}
/**
 * A cache that holds its values weakly, allowing them to be garbage-collected
 * if they are not referenced elsewhere. Keys are standard strings or numbers.
 *
 * This is useful for caching large objects that should be automatically evicted
 * from memory when they are no longer in use.
 *
 * To safely access a value, use `getPin()` which returns a "Pin". A Pin holds a
 * strong reference to the value, preventing it from being garbage-collected
 * while you are using it. You MUST call `pin.release()` when you are done
 * to allow garbage collection to occur.
 */
export declare class VolatileValueCache<K extends string | number, V> {
    private _cache;
    private _keyRegistry;
    private _finalizationRegistry;
    _getPin(valueObject: ValueWrapper<V>): Pin<V>;
    constructor();
    set(key: K, value: V): Pin<V>;
    getPin(key: K): Pin<V> | undefined;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    _delete(keyObject: object): void;
}
