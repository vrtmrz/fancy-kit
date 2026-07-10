import type { SimpleStoreCRUDSupportTransaction } from "../databases/SimpleStoreBase";
import { PersistentIDBBackedQueue } from "./PersistentIDBBackedQueue";
/**
 * A persistent backed queue that revokes all queued and 'in-flight' items on initialization.
 * Mostly used for data-conversion or in-trans encryption or something similar.
 * Please be aware for the volatile nature of 'in-flight' items being revoked.
 * @template T The type of items in the queue.
 */
export declare class HalfPersistentIDBBackedQueue<T> extends PersistentIDBBackedQueue<T> {
    get basePrefix(): string;
    /**
     *  Initializes the queue by revoking all items.
     * @param storage
     */
    init(storage: SimpleStoreCRUDSupportTransaction<T>): Promise<void>;
}
