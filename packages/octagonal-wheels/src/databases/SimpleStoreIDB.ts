import { SimpleStoreIDBv2 } from "./SimpleStoreIDBv2.ts";

export class SimpleStoreIDB<T> extends SimpleStoreIDBv2<T> {
    private static _instanceCount = 0;

    /**
     * @deprecated Use SimpleStoreIDB.open instead.
     * @param name a name for the database
     * @param instanceName an optional instance name for the database (if not provided, an automatic instance name will be generated)
     * @description
     * Note: Opening multiple instances with the same instance name by the constructor may throw errors.
     * Use SimpleStoreIDB.open to get a singleton instance instead.
     */
    constructor(name: string, instanceName?: string) {
        const instanceNameFinal = instanceName ?? `${name}-auto-instance-${++SimpleStoreIDB._instanceCount}`;
        super(name, instanceNameFinal);
    }
}
