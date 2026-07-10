import { FallbackFinalizationRegistry, FallbackWeakRef } from '../common/polyfill.js';

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
class VolatileValueCache {
    _getPin(valueObject) {
        return {
            _value: valueObject,
            get value() {
                // Return the wrapped value. This getter ensures that even if release() is called,
                // accessing .value will not throw an error (it will return undefined).
                return this._value?.value;
            },
            release() {
                // By deleting the _value property, this Pin object no longer holds a strong
                // reference to the valueObject. If no other strong references exist,
                // the valueObject can now be garbage collected.
                delete this._value;
            },
        };
    }
    constructor() {
        Object.defineProperty(this, "_cache", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new WeakMap()
        });
        Object.defineProperty(this, "_keyRegistry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "_finalizationRegistry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._finalizationRegistry = new FallbackFinalizationRegistry((key) => {
            const keyObject = this._keyRegistry.get(key);
            // This should not happen with all protection combinations but protect against it
            /* istanbul ignore next -- @preserve */
            if (keyObject === undefined)
                return; // Already cleaned up
            // If keyObject exists and the cache value has been garbage collected
            const currentVal = this._cache.get(keyObject);
            if (currentVal === undefined || currentVal.deref() === undefined) {
                this._keyRegistry.delete(key);
                return;
            }
            // If something is able to dereference the value, it means it is still alive
        });
    }
    set(key, value) {
        let keyObject = this._keyRegistry.get(key);
        if (!keyObject) {
            keyObject = {};
            this._keyRegistry.set(key, keyObject);
        }
        const valueObject = { value };
        const valueRef = new FallbackWeakRef(valueObject);
        this._cache.set(keyObject, valueRef);
        this._finalizationRegistry.register(valueObject, key, keyObject);
        return this._getPin(valueObject);
    }
    getPin(key) {
        const keyObject = this._keyRegistry.get(key);
        if (keyObject === undefined)
            return undefined;
        const valueRef = this._cache.get(keyObject);
        const valueWrapper = valueRef?.deref();
        // This should not happen with all protection combinations but protect against it
        /* istanbul ignore next -- @preserve */
        if (valueWrapper === undefined) {
            this._delete(keyObject);
            return undefined;
        }
        return this._getPin(valueWrapper);
    }
    get(key) {
        const wrapper = this.getPin(key);
        return wrapper?.value;
    }
    has(key) {
        const keyObject = this._keyRegistry.get(key);
        if (keyObject === undefined)
            return false;
        const valueRef = this._cache.get(keyObject);
        const valueWrapper = valueRef?.deref();
        // This should not happen with all protection combinations but protect against it
        /* istanbul ignore next -- @preserve */
        if (valueWrapper === undefined) {
            this._delete(keyObject);
            return false;
        }
        return true;
    }
    delete(key) {
        const keyObject = this._keyRegistry.get(key);
        if (keyObject === undefined)
            return false;
        this._delete(keyObject);
        this._keyRegistry.delete(key);
        return true;
    }
    _delete(keyObject) {
        this._finalizationRegistry.unregister(keyObject);
        this._cache.delete(keyObject);
    }
}

export { VolatileValueCache };
//# sourceMappingURL=VolatileValueCache.js.map
