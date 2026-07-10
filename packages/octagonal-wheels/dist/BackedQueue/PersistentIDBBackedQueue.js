import { PersistentIDBBackedQueueBase } from './BackedQueue.js';
import { PREFIX_BACKED_QUEUE_PERSISTENT } from './BackedQueueTypes.js';

/**
 * A persistent backed queue that tracks 'in-flight' processing keys.
 * Suitable for multi-worker scenarios.
 * @template T The type of items in the queue.
 */
class PersistentIDBBackedQueue extends PersistentIDBBackedQueueBase {
    get basePrefix() {
        return PREFIX_BACKED_QUEUE_PERSISTENT;
    }
}

export { PersistentIDBBackedQueue };
//# sourceMappingURL=PersistentIDBBackedQueue.js.map
