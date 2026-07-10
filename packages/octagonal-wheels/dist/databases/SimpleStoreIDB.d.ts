import { SimpleStoreIDBv2 } from "./SimpleStoreIDBv2.ts";
export declare class SimpleStoreIDB<T> extends SimpleStoreIDBv2<T> {
    private static _instanceCount;
    /**
     * @deprecated Use SimpleStoreIDB.open instead.
     * @param name a name for the database
     * @param instanceName an optional instance name for the database (if not provided, an automatic instance name will be generated)
     * @description
     * Note: Opening multiple instances with the same instance name by the constructor may throw errors.
     * Use SimpleStoreIDB.open to get a singleton instance instead.
     */
    constructor(name: string, instanceName?: string);
}
