import { Logger, LOG_LEVEL_INFO } from "../common/logger";
import { BackedQueue } from "./BackedQueue.ts";
import type { QueueKeyOnProcess } from "./BackedQueueTypes.ts";
import { QueueBackendMemory } from "./QueueBackendMemory.ts";
import { QueueBackendWithTransaction } from "./QueueBackendTypes.ts";

/**
 * A simple in-memory backed queue.
 * All items are stored in memory and will be lost when the process exits.
 * This is mainly useful for testing or temporary queues.
 * @template T The type of items in the queue.
 */
export class MemoryBackedQueue<T> extends BackedQueue<T> {
    backend: QueueBackendWithTransaction<T>;
    constructor(name: string) {
        super(name);
        this.backend = new QueueBackendMemory<T>(this._name, this.basePrefix);
    }
    get basePrefix() {
        return "bq-m";
    }
    protected addDeadLetter(key: QueueKeyOnProcess, item: T): Promise<void> {
        // Stub implementation, do nothing and just log
        Logger(`Dead letter added for key ${key}`, LOG_LEVEL_INFO);
        return Promise.resolve();
    }
}
