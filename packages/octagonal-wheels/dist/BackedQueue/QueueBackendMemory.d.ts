import type { QueueKey, QueueKeyOnProcess } from "./BackedQueueTypes.ts";
import type { QueueBackendWithTransaction, QueueBackendTransaction } from "./QueueBackendTypes.ts";
/**
 * A simple in-memory backend store for testing purposes.
 * @template T The type of items in the queue.
 */
export declare class QueueBackendMemory<T> implements QueueBackendWithTransaction<T> {
    private _queueMap;
    protected readonly _name: string;
    protected readonly _basePrefix: string;
    protected _startupTime: number;
    protected _sessionRandom: number;
    protected _incrementalId: number;
    protected _shouldBypassKey: (key: string) => boolean;
    get prefix(): string;
    get processingPrefix(): string;
    constructor(name: string, basePrefix: string, shouldBypass?: (key: string) => boolean, base?: {
        queueMapBase: Map<QueueKey, T>;
        startupTime: number;
        sessionRandom: number;
        incrementalId: number;
    });
    private _getQueueKey;
    private _getProcessingKey;
    getQueuedItem(key: QueueKey): Promise<T | undefined>;
    setQueueItem(key: QueueKey, item: T): Promise<void>;
    deleteQueueItem(key: QueueKey): Promise<void>;
    getProcessingItem(key: QueueKeyOnProcess): Promise<T | undefined>;
    setProcessingItem(key: QueueKeyOnProcess, item: T): Promise<void>;
    deleteProcessingItem(key: QueueKeyOnProcess): Promise<void>;
    atomic<U>(callback: (store: QueueBackendTransaction<T>) => Promise<U>): Promise<U>;
    keys(from: string | undefined, to: string | undefined, count?: number | undefined): Promise<string[]>;
    getNextQueueKey(): Promise<QueueKey | undefined>;
    issueNewQueueKey(): QueueKey;
}
