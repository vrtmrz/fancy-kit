import { BackedQueue } from "./BackedQueue.ts";
import type { QueueKeyOnProcess } from "./BackedQueueTypes.ts";
import { QueueBackendWithTransaction } from "./QueueBackendTypes.ts";
/**
 * A simple in-memory backed queue.
 * All items are stored in memory and will be lost when the process exits.
 * This is mainly useful for testing or temporary queues.
 * @template T The type of items in the queue.
 */
export declare class MemoryBackedQueue<T> extends BackedQueue<T> {
    backend: QueueBackendWithTransaction<T>;
    constructor(name: string);
    get basePrefix(): string;
    protected addDeadLetter(key: QueueKeyOnProcess, item: T): Promise<void>;
}
