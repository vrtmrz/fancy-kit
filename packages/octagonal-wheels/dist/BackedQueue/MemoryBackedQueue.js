import { Logger, LOG_LEVEL_INFO } from '../common/logger.js';
import { BackedQueue } from './BackedQueue.js';
import { QueueBackendMemory } from './QueueBackendMemory.js';

/**
 * A simple in-memory backed queue.
 * All items are stored in memory and will be lost when the process exits.
 * This is mainly useful for testing or temporary queues.
 * @template T The type of items in the queue.
 */
class MemoryBackedQueue extends BackedQueue {
    constructor(name) {
        super(name);
        Object.defineProperty(this, "backend", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.backend = new QueueBackendMemory(this._name, this.basePrefix);
    }
    get basePrefix() {
        return "bq-m";
    }
    addDeadLetter(key, item) {
        // Stub implementation, do nothing and just log
        Logger(`Dead letter added for key ${key}`, LOG_LEVEL_INFO);
        return Promise.resolve();
    }
}

export { MemoryBackedQueue };
//# sourceMappingURL=MemoryBackedQueue.js.map
