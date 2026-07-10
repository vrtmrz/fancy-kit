var _a;
const FallbackWeakRef = "WeakRef" in globalThis
    ? globalThis.WeakRef
    : (_a = class WeakRef {
            constructor(target) {
                Object.defineProperty(this, "__target", {
                    enumerable: true,
                    configurable: true,
                    writable: true,
                    value: void 0
                });
                this.__target = target;
            }
            deref() {
                return this.__target;
            }
        },
        // If WeakRef implementation has been missing, we will use a simple polyfill
        // This is for old iOS devices that do not support WeakRef (before Safari 14.5), and for Android devices that use old WebView engines.
        // I know that Obsidian now supports Safari 14.5 and above now, but I will keep this for compatibility with older versions.
        // Note: This is a `StrongRef`. It is not a `WeakRef` in the true sense. Just for compatibility.
        //@ts-ignore
        Object.defineProperty(_a, "__", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: console.warn("WeakRef is not supported in this environment. Using a fallback implementation. This may cause memory leaks. Please consider upgrading your browser or Node.js version. If you are on Android, please consider changing your WebView engine to a newer version. It is on the Developer Settings.")
        }),
        _a);
const FallbackFinalizationRegistry = "FinalizationRegistry" in globalThis
    ? globalThis.FinalizationRegistry
    : class PolyfillFinalizationRegistry {
        constructor(callback) { }
        register(target, heldValue, unregisterToken) { }
        unregister(unregisterToken) {
            return true;
        }
    };

export { FallbackFinalizationRegistry, FallbackWeakRef };
//# sourceMappingURL=polyfill.js.map
