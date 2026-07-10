import { SimpleStoreIDBv2 } from './SimpleStoreIDBv2.js';

class SimpleStoreIDB extends SimpleStoreIDBv2 {
    /**
     * @deprecated Use SimpleStoreIDB.open instead.
     * @param name a name for the database
     * @param instanceName an optional instance name for the database (if not provided, an automatic instance name will be generated)
     * @description
     * Note: Opening multiple instances with the same instance name by the constructor may throw errors.
     * Use SimpleStoreIDB.open to get a singleton instance instead.
     */
    constructor(name, instanceName) {
        const instanceNameFinal = instanceName ?? `${name}-auto-instance-${++SimpleStoreIDB._instanceCount}`;
        super(name, instanceNameFinal);
    }
}
Object.defineProperty(SimpleStoreIDB, "_instanceCount", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: 0
});

export { SimpleStoreIDB };
//# sourceMappingURL=SimpleStoreIDB.js.map
