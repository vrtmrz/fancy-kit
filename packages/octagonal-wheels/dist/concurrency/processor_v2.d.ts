import type { ReactiveSource } from "../dataobject/reactive.ts";
import { type PromiseWithResolvers, type TIMED_OUT_SIGNAL } from "../promises.ts";
import { EventHub } from "../events.ts";
import { PaceMaker } from "../bureau/PaceMaker.ts";
import { Clerk, ClerkGroup } from "../bureau/Clerk.ts";
import { Inbox } from "../bureau/Inbox.ts";
/**
 * @deprecated Use EventHub and waitFor instead.
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
    /**
     * @deprecated
     *
     */
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
interface ProcessorEvents {
    yielded: undefined;
    tickEmpty: undefined;
    tickImmediate: undefined;
    tick: undefined;
    tickDelayTimeout: undefined;
    tickSuspended: undefined;
    tickResumed: undefined;
    suspended: undefined;
    idle: undefined;
}
export declare class QueueProcessor<T, U> {
    _queue: T[];
    _processor: Processor<T, U>;
    _enqueueProcessor: (queue: T[], newEntity: T) => T[];
    _isSuspended: boolean;
    _nextProcessNeedsImmediate: boolean;
    _pipeTo?: QueueProcessor<U, any>;
    _root?: QueueProcessor<any, any>;
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
    _hub: EventHub<ProcessorEvents>;
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
    _initEventHub(): void;
    _waitFor<const T extends (keyof ProcessorEvents)[]>(keys: T, timeout?: number): Promise<T[number] | TIMED_OUT_SIGNAL>;
    _triggerTickDelay(): void;
    _clearTickDelay(): void;
    _notifyIfIdle(): void;
    __notifyIfIdle(): void;
    _onTick(): void;
    _delayTimer?: ReturnType<typeof setTimeout>;
    _intervalPaceMaker: PaceMaker;
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
    _waitForIdle(): Promise<void>;
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
    _waitForSuspended(): Promise<void>;
    flush(): Promise<boolean>;
    waitForAllDownstream(timeout?: number): Promise<boolean>;
    waitForAllProcessed(timeout?: number): Promise<boolean>;
    waitForAllDoneAndTerminate(timeout?: number): Promise<boolean>;
    _runProcessor(items: T[]): Promise<void>;
    pump(): AsyncGenerator<T[], void, unknown>;
    _processingBatches: Set<number>;
    addProcessingBatch: typeof this._processingBatches.add;
    deleteProcessingBatch: typeof this._processingBatches.delete;
    _processing: boolean;
    _collected: Inbox<T[]>;
    _clerks: ClerkGroup<T[], Clerk<T[]>>;
    _processCount: number;
    _initClerks(): void;
    _process(): Promise<void>;
    _run(): void;
    terminateAll(): void;
    terminate(): void;
}
export declare function stopAllRunningProcessors(): void;
export {};
