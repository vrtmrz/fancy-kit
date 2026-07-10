import type { SimpleStoreCRUDSupportTransaction } from "../databases/SimpleStoreBase";
import { PREFIX_BACKED_QUEUE_HALF_PERSISTENT } from "./BackedQueueTypes";
import { PersistentIDBBackedQueue } from "./PersistentIDBBackedQueue";

/**
 * A persistent backed queue that revokes all queued and 'in-flight' items on initialization.
 * Mostly used for data-conversion or in-trans encryption or something similar.
 * Please be aware for the volatile nature of 'in-flight' items being revoked.
 * @template T The type of items in the queue.
 */

export class HalfPersistentIDBBackedQueue<T> extends PersistentIDBBackedQueue<T> {
    get basePrefix() {
        return PREFIX_BACKED_QUEUE_HALF_PERSISTENT;
    }
    /**
     *  Initializes the queue by revoking all items.
     * @param storage
     */
    override async init(storage: SimpleStoreCRUDSupportTransaction<T>): Promise<void> {
        // At here, in-flight items are reverted by the parent init.
        await super.init(storage);
        // Now, we need to revoke all queued items as well.
        const prefix = this.backend.prefix;
        const keys = await this.backend.keys(prefix, prefix + "\uffff");
        for (const key of keys) {
            const originalKey = key.substring(prefix.length);
            await this.revoke(originalKey);
        }
    }
}
