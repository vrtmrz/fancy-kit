import { PREFIX_BACKED_QUEUE_HALF_PERSISTENT } from './BackedQueueTypes.js';
import { PersistentIDBBackedQueue } from './PersistentIDBBackedQueue.js';

/**
 * A persistent backed queue that revokes all queued and 'in-flight' items on initialization.
 * Mostly used for data-conversion or in-trans encryption or something similar.
 * Please be aware for the volatile nature of 'in-flight' items being revoked.
 * @template T The type of items in the queue.
 */
class HalfPersistentIDBBackedQueue extends PersistentIDBBackedQueue {
    get basePrefix() {
        return PREFIX_BACKED_QUEUE_HALF_PERSISTENT;
    }
    /**
     *  Initializes the queue by revoking all items.
     * @param storage
     */
    async init(storage) {
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

export { HalfPersistentIDBBackedQueue };
//# sourceMappingURL=HalfPersistentIDBBackedQueue.js.map
