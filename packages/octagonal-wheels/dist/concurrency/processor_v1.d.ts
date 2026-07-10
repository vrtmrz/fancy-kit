import type { ReactiveSource } from "../dataobject/reactive.ts";
import { type PromiseWithResolvers } from "../promises.ts";
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use processor_v2.ts instead.
 */
export declare class Notifier {
    _p: PromiseWithResolvers<void>;
    isUsed: boolean;
    notify(): void;
    get nextNotify(): Promise<void>;
}
/**
 * QueueProcessor Parameters
 */
type ProcessorParams<T> = {
    /**
     * How many processes runs concurrently
     */
    concurrentLimit?: number;
    /**
     * Number of entities passed to the processor at once
     */
    batchSize?: number;
    /**
     * Numbers of queued entities to ignore delay and run immediately
     */
    yieldThreshold?: number;
    /**
     * Time(ms) to ignore yieldThreshold and run process
     */
    delay?: number;
    interval?: number;
    maintainDelay?: boolean;
    suspended: boolean;
    /**
     * ReactiveSource to notify the remaining count.
     */
    remainingReactiveSource?: ReactiveSource<number>;
    /**
     * ReactiveSource to notify the total remaining count.
     */
    totalRemainingReactiveSource?: ReactiveSource<number>;
    /**
     * ReactiveSource to notify how many items are processing;
     */
    processingEntitiesReactiveSource?: ReactiveSource<number>;
    /**
     * If true, processed result will be buffered until a downstream has been connected.
     */
    keepResultUntilDownstreamConnected?: boolean;
    pipeTo?: QueueProcessor<T, any>;
};
type ProcessorResult<T> = Promise<T[]> | T[] | undefined | void | Promise<void> | Promise<undefined>;
type Processor<T, U> = (entity: T[]) => ProcessorResult<U>;
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use processor_v2.ts instead.
 */
export declare class QueueProcessor<T, U> {
    _queue: T[];
    _processor: Processor<T, U>;
    _enqueueProcessor: (queue: T[], newEntity: T) => T[];
    _isSuspended: boolean;
    _nextProcessNeedsImmediate: boolean;
    _pipeTo?: QueueProcessor<U, any>;
    _waitId: string;
    _root?: QueueProcessor<any, any>;
    _instance: number;
    _remainingReactiveSource?: ReactiveSource<number>;
    _totalRemainingReactiveSource?: ReactiveSource<number>;
    _processingEntitiesReactiveSource?: ReactiveSource<number>;
    _keepResultUntilDownstreamConnected: boolean;
    _keptResult: U[];
    _runOnUpdateBatch: () => void;
    concurrentLimit: number;
    batchSize: number;
    yieldThreshold: number;
    delay: number;
    maintainDelay: boolean;
    interval: number;
    processingEntities: number;
    waitingEntries: number;
    get nowProcessing(): number;
    get totalNowProcessing(): number;
    get remaining(): number;
    get totalRemaining(): number;
    updateStatus(setFunc: () => void): void;
    suspend(): QueueProcessor<T, U>;
    resume(): this;
    resumePipeLine(): this;
    startPipeline(): this;
    get root(): QueueProcessor<any, any>;
    _notifier: Notifier;
    constructor(processor: Processor<T, U>, params?: ProcessorParams<U>, items?: T[], enqueueProcessor?: (queue: T[], newEntity: T) => T[]);
    /**
     * replace enqueue logic.
     * @param processor enqueue logic. this should return new queue.
     * @returns
     */
    replaceEnqueueProcessor(processor: (queue: T[], newItem: T) => T[]): this;
    /**
     * Modify the queue by force.
     * @param processor
     * @remarks I know that you have known this is very dangerous.
     */
    modifyQueue(processor: (queue: T[]) => T[]): void;
    /**
     * Clear the queue
     * @remarks I know that you have known this is very dangerous.
     */
    clearQueue(): void;
    /**
     * Set the handler for when the queue has been modified
     * @param proc
     * @returns
     */
    onUpdateProgress(proc: () => void): this;
    /**
     * Join another processor
     * @param pipeTo
     * @returns
     */
    pipeTo<V>(pipeTo: QueueProcessor<U, V>): QueueProcessor<U, V>;
    isIdle(): boolean;
    _isIdle(): boolean;
    _idleDetector(): Promise<void>;
    idleDetectors(): Promise<void>[];
    get isSuspended(): boolean;
    _updateReactiveSource(): void;
    updateReactiveSource(): void;
    _updateBatchProcessStatus(): void;
    _collectBatch(): T[];
    _canCollectBatch(): boolean;
    enqueue(entity: T): this;
    enqueueAll(entities: T[]): this;
    requestNextFlush(): void;
    flush(): Promise<boolean> | undefined;
    waitForAllDownstream(timeout?: number): Promise<boolean>;
    waitForAllProcessed(timeout?: number): Promise<boolean>;
    waitForAllDoneAndTerminate(timeout?: number): Promise<boolean>;
    _runProcessor(items: T[]): Promise<void>;
    pump(): AsyncGenerator<T[], void, unknown>;
    _processingBatches: Set<number>;
    addProcessingBatch: typeof this._processingBatches.add;
    deleteProcessingBatch: typeof this._processingBatches.delete;
    _processing: boolean;
    delayUntilRequested(delayMs: number): Promise<void>;
    _process(): Promise<void>;
    _run(): void;
    terminateAll(): void;
    terminate(): void;
}
/**
 * @deprecated This module is deprecated and will be removed in the future.
 * use processor_v2.ts instead.
 */
export declare function stopAllRunningProcessors(): void;
export {};
