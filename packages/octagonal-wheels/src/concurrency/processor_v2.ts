import { Logger, LOG_LEVEL_VERBOSE } from "../common/logger.ts";
import type { ReactiveSource } from "../dataobject/reactive.ts";
import { RESULT_TIMED_OUT } from "../common/const.ts";
import {
    noop,
    delay,
    fireAndForget,
    promiseWithResolvers,
    type PromiseWithResolvers,
    type TIMED_OUT_SIGNAL,
    cancelableDelay,
} from "../promises.ts";
import { EventHub } from "../events.ts";
import { PaceMaker } from "../bureau/PaceMaker.ts";
import { Clerk, ClerkGroup } from "../bureau/Clerk.ts";
import { Inbox } from "../bureau/Inbox.ts";

/**
 * @deprecated Use EventHub and waitFor instead.
 */
export class Notifier {
    _p: PromiseWithResolvers<void> = promiseWithResolvers<void>();
    isUsed = false;
    notify() {
        if (!this.isUsed) {
            return;
        }
        this.isUsed = false;
        void this._p.promise.finally(noop);
        this._p.resolve();
        this._p = promiseWithResolvers();
    }
    get nextNotify(): Promise<void> {
        this.isUsed = true;
        return this._p.promise;
    }
}

const allRunningProcessors = new Set<QueueProcessor<any, any>>([]);

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
export class QueueProcessor<T, U> {
    _queue: T[] = [];
    _processor: Processor<T, U>;
    _enqueueProcessor: (queue: T[], newEntity: T) => T[] = (queue, entity) => (queue.push(entity), queue);
    _isSuspended = true;
    _nextProcessNeedsImmediate = false;

    _pipeTo?: QueueProcessor<U, any>;

    _root?: QueueProcessor<any, any> = undefined;
    _remainingReactiveSource?: ReactiveSource<number>;
    _totalRemainingReactiveSource?: ReactiveSource<number>;
    _processingEntitiesReactiveSource?: ReactiveSource<number>;
    _keepResultUntilDownstreamConnected = false;
    _keptResult = [] as U[];

    _runOnUpdateBatch: () => void = () => {};

    // Parameters

    // How many processes running concurrently
    concurrentLimit: number = 1;

    // How many entries processed at once
    batchSize: number = 1;

    // How many entries kept in before the delay
    yieldThreshold: number = 1;

    // If set, wait for set milliseconds after enqueued
    // Note: If reached to the batchSize, run immediately
    delay: number = 0;
    maintainDelay: boolean;
    interval: number = 0;

    // This means numbers of the entities which are now processing
    processingEntities: number = 0;

    // This means numbers of the entries which dequeued from the queue but not processed yet.
    waitingEntries: number = 0;

    // Event Hub
    _hub: EventHub<ProcessorEvents> = new EventHub<ProcessorEvents>();

    get nowProcessing(): number {
        return this.processingEntities;
    }
    get totalNowProcessing(): number {
        return this.nowProcessing + (this._pipeTo?.totalNowProcessing || 0);
    }

    get remaining(): number {
        return this._queue.length + this.processingEntities + this.waitingEntries;
    }
    get totalRemaining(): number {
        return this.remaining + (this._pipeTo?.totalRemaining || 0);
    }
    updateStatus(setFunc: () => void): void {
        setFunc();
        this._updateReactiveSource();
    }

    suspend(): QueueProcessor<T, U> {
        this._isSuspended = true;
        this._hub.emitEvent("tickSuspended");
        return this;
    }

    resume(): this {
        this._isSuspended = false;
        this._hub.emitEvent("tickResumed");
        return this;
    }
    resumePipeLine(): this {
        this._pipeTo?.resumePipeLine();
        this.resume();
        return this;
    }
    startPipeline(): this {
        this.root.resumePipeLine();
        return this;
    }

    get root(): QueueProcessor<any, any> {
        if (this._root === undefined) {
            return this;
        }
        return this._root;
    }

    _initEventHub() {
        this._hub.onEvent("tickResumed", () => this._run());
    }

    async _waitFor<const T extends (keyof ProcessorEvents)[]>(
        keys: T,
        timeout?: number
    ): Promise<T[number] | TIMED_OUT_SIGNAL> {
        const items = keys.map((key) => {
            const p = promiseWithResolvers<typeof key>();
            const releaser = this._hub.onEvent(key, () => {
                p.resolve(key);
            });
            p.promise = p.promise.finally(() => {
                releaser();
            });
            return p;
        });
        const timer = timeout ? cancelableDelay(timeout) : undefined;
        const tasks = [...items.map((i) => i.promise), ...(timer ? [timer.promise] : [])];
        const ret = await Promise.race(tasks);
        // Release unhandled eventHandlers
        items.forEach((i) => i.resolve(undefined!));
        return ret;
    }
    _triggerTickDelay() {
        if (!this._delayTimer) {
            this._delayTimer = setTimeout(() => {
                this._hub.emitEvent("tickDelayTimeout");
                this._delayTimer = undefined;
            });
        }
    }
    _clearTickDelay() {
        if (this._delayTimer) {
            clearTimeout(this._delayTimer);
            this._delayTimer = undefined;
        }
    }
    _notifyIfIdle() {
        return this.root.__notifyIfIdle();
    }
    __notifyIfIdle() {
        if (this._processCount == 0 && !this._canCollectBatch()) {
            this._hub.emitEvent("idle");
        }
        if (this._pipeTo) {
            this._pipeTo.__notifyIfIdle();
        }
    }

    _onTick() {
        if (!this._canCollectBatch()) {
            this._notifyIfIdle();
            this._clearTickDelay();
            this._hub.emitEvent("tickEmpty");
            return;
        }
        if (this._nextProcessNeedsImmediate) {
            this._clearTickDelay();
            this._nextProcessNeedsImmediate = false;
            this._hub.emitEvent("tickImmediate");
            return;
        }
        if (this._queue.length > this.yieldThreshold) {
            this._clearTickDelay();
            this._hub.emitEvent("yielded");
        } else {
            if (!this.delay) {
                this._clearTickDelay();
                this._hub.emitEvent("tickDelayTimeout");
                return;
            }
            if (this._delayTimer) {
                // NO OP.
            } else {
                this._triggerTickDelay();
            }
        }
    }

    _delayTimer?: ReturnType<typeof setTimeout>;

    _intervalPaceMaker: PaceMaker;

    constructor(
        processor: Processor<T, U>,
        params?: ProcessorParams<U>,
        items?: T[],
        enqueueProcessor?: (queue: T[], newEntity: T) => T[]
    ) {
        this._root = this;
        this._processor = processor;
        this.batchSize = params?.batchSize ?? 1;
        this.yieldThreshold = params?.yieldThreshold ?? params?.batchSize ?? 0;
        this.concurrentLimit = params?.concurrentLimit ?? 1;
        this.delay = params?.delay ?? 0;
        this.maintainDelay = params?.maintainDelay ?? false;
        this.interval = params?.interval ?? 0;
        if (params?.keepResultUntilDownstreamConnected)
            this._keepResultUntilDownstreamConnected = params.keepResultUntilDownstreamConnected;
        if (params?.remainingReactiveSource) this._remainingReactiveSource = params?.remainingReactiveSource;
        if (params?.totalRemainingReactiveSource)
            this._totalRemainingReactiveSource = params?.totalRemainingReactiveSource;
        if (params?.processingEntitiesReactiveSource)
            this._processingEntitiesReactiveSource = params?.processingEntitiesReactiveSource;
        if (params?.suspended !== undefined) this._isSuspended = params?.suspended;
        if (enqueueProcessor) this.replaceEnqueueProcessor(enqueueProcessor);
        if (params?.pipeTo !== undefined) {
            this.pipeTo(params.pipeTo);
        }
        this._intervalPaceMaker = new PaceMaker(this.interval);
        if (items) this.enqueueAll(items);
        allRunningProcessors.add(this);
        this._initClerks();
        this._initEventHub();
        this.resume();
    }

    /**
     * replace enqueue logic.
     * @param processor enqueue logic. this should return new queue.
     * @returns
     */
    replaceEnqueueProcessor(processor: (queue: T[], newItem: T) => T[]): this {
        this._enqueueProcessor = processor;
        return this;
    }

    /**
     * Modify the queue by force.
     * @param processor
     * @remarks I know that you have known this is very dangerous.
     */
    modifyQueue(processor: (queue: T[]) => T[]): void {
        this._queue = processor(this._queue);
        this._onTick();
    }

    /**
     * Clear the queue
     * @remarks I know that you have known this is very dangerous.
     */
    clearQueue(): void {
        this._queue = [];
        this._onTick();
    }

    /**
     * Set the handler for when the queue has been modified
     * @param proc
     * @returns
     */
    onUpdateProgress(proc: () => void): this {
        this._runOnUpdateBatch = proc;
        return this;
    }

    /**
     * Join another processor
     * @param pipeTo
     * @returns
     */
    pipeTo<V>(pipeTo: QueueProcessor<U, V>): QueueProcessor<U, V> {
        this._pipeTo = pipeTo;
        this._pipeTo._root = this.root;
        // If something buffered, send to the downstream.
        if (this._keptResult.length > 0) {
            const temp = [...this._keptResult];
            this._keptResult = [];
            this._pipeTo.enqueueAll(temp);
        }
        return pipeTo;
    }

    isIdle(): boolean {
        return this._isIdle() && (!this._pipeTo ? true : this._pipeTo.isIdle());
    }
    _isIdle(): boolean {
        return this.totalRemaining == 0;
    }
    async _waitForIdle(): Promise<void> {
        if (this._isSuspended) return Promise.resolve();
        if (this._isIdle()) return Promise.resolve();
        do {
            const r = await this._waitFor(["tickEmpty", "tick", "tickSuspended", "suspended", "idle"]);
            if (r === "tickSuspended") break;
            if (r == "suspended") break;
            if (r == "tickEmpty") break;
            if (r == "idle") break;
        } while (!this._isIdle());
        return Promise.resolve();
    }

    idleDetectors(): Promise<void>[] {
        const thisPromise = this._waitForIdle();
        if (this._pipeTo) {
            return [thisPromise, ...this._pipeTo.idleDetectors()];
        }
        return [thisPromise];
    }

    get isSuspended(): boolean {
        return this._isSuspended || this._pipeTo?.isSuspended || false;
    }

    _updateReactiveSource(): void {
        this.root.updateReactiveSource();
    }
    updateReactiveSource(): void {
        if (this._pipeTo) {
            this._pipeTo.updateReactiveSource();
        }
        if (this._remainingReactiveSource) this._remainingReactiveSource.value = this.remaining;
        if (this._totalRemainingReactiveSource) this._totalRemainingReactiveSource.value = this.totalRemaining;
        if (this._processingEntitiesReactiveSource) this._processingEntitiesReactiveSource.value = this.nowProcessing;
    }
    _updateBatchProcessStatus(): void {
        this._updateReactiveSource();
        this._runOnUpdateBatch();
    }

    _collectBatch(): T[] {
        return this._queue.splice(0, this.batchSize);
    }
    _canCollectBatch(): boolean {
        return this._queue.length !== 0;
    }

    enqueue(entity: T): this {
        this._queue = this._enqueueProcessor(this._queue, entity);
        this._updateBatchProcessStatus();
        this._onTick();
        return this;
    }
    enqueueAll(entities: T[]): this {
        let queue = this._queue;
        for (const v of entities) {
            queue = this._enqueueProcessor(queue, v);
        }
        this._queue = queue;
        this._updateBatchProcessStatus();
        this._onTick();
        return this;
    }

    requestNextFlush(): void {
        // if (this._canCollectBatch()) {
        this._nextProcessNeedsImmediate = true;
        this._onTick();
        // }
    }

    async _waitForSuspended() {}

    flush(): Promise<boolean> {
        if (this._isSuspended) return Promise.resolve(false);
        this.requestNextFlush();
        return this.waitForAllDownstream();
    }

    async waitForAllDownstream(timeout?: number): Promise<boolean> {
        // Prepare timeout detector
        const baseTasks = [] as Promise<unknown>[];
        if (timeout) {
            baseTasks.push(delay(timeout, RESULT_TIMED_OUT));
        }
        do {
            const idleTasks = this.idleDetectors();
            const tasks = [...baseTasks, Promise.all(idleTasks)];
            const ret = await Promise.race(tasks);
            if (ret === RESULT_TIMED_OUT) return false;
        } while (!this.isIdle());
        return true;
    }

    waitForAllProcessed(timeout?: number): Promise<boolean> {
        this.root.startPipeline();
        return this.root.waitForAllDownstream(timeout);
    }
    async waitForAllDoneAndTerminate(timeout?: number): Promise<boolean> {
        this.root.startPipeline();
        const r = await this.root.waitForAllDownstream(timeout);
        this.terminateAll();
        return r;
    }

    async _runProcessor(items: T[]): Promise<void> {
        // runProcessor does not modify queue. so updateStatus should only update about reactiveSource.
        const ret = await this._processor(items);
        if (!ret) return;
        // If downstream is connected, the result sent to that.
        if (this._pipeTo) {
            this._pipeTo.enqueueAll(ret);
        } else if (this._keepResultUntilDownstreamConnected) {
            // Buffer the result if downstream is not connected.
            this._keptResult.push(...ret);
        }
    }
    async *pump(): AsyncGenerator<T[], void, unknown> {
        do {
            const ticked = await this._waitFor([
                "tickImmediate",
                "yielded",
                "tickSuspended",
                "tickDelayTimeout",
                "tickSuspended",
            ]);
            // console.log(`Ticked:${String(ticked)}`);
            L2: do {
                const items = this._collectBatch();
                // console.warn(`Pumping ${items.length} items`);
                if (items.length == 0) break L2;
                yield items;
            } while (this._canCollectBatch());
            if (ticked == "tickSuspended") break;
        } while (!this._isSuspended);
    }
    _processingBatches: Set<number> = new Set<number>();
    addProcessingBatch: typeof this._processingBatches.add = (value) => {
        const r = this._processingBatches.add(value);
        this._updateBatchProcessStatus();
        return r;
    };
    deleteProcessingBatch: typeof this._processingBatches.delete = (value) => {
        const r = this._processingBatches.delete(value);
        this._updateBatchProcessStatus();
        return r;
    };
    _processing: boolean = false;

    _collected!: Inbox<T[]>;
    _clerks!: ClerkGroup<T[], Clerk<T[]>>;
    _processCount = 0;
    _initClerks() {
        this._collected = new Inbox(this.concurrentLimit * 2);
        this._clerks = new ClerkGroup({
            assigned: this._collected,
            job: async (items) => {
                const batchLength = items.length;
                this.updateStatus(() => {
                    this.processingEntities += batchLength;
                    this.waitingEntries -= batchLength;
                });
                // console.warn(`Clerk start! (${items.length} items )`);
                await this._intervalPaceMaker.paced;
                this._processCount++;
                try {
                    // console.warn(items);
                    await this._runProcessor(items);
                    // console.warn("OK");
                } catch (ex) {
                    // console.warn("ERR");
                    Logger(`Processor error!`);
                    Logger(ex, LOG_LEVEL_VERBOSE);
                }
                // console.warn(`Clerk finished!`);
                this.updateStatus(() => {
                    this.processingEntities -= batchLength;
                });
                this._processCount--;
                if (this._processCount == 0) {
                    this._notifyIfIdle();
                }
            },
            initialMemberCount: this.concurrentLimit,
            instantiate: (params) => new Clerk(params),
        });
    }
    async _process(): Promise<void> {
        if (this._processing || this._isSuspended) return;
        // let lastProcessBegin = 0;
        try {
            this._processing = true;
            do {
                const batchPump = this.pump();
                for await (const batch of batchPump) {
                    if (!batch || batch.length === 0) {
                        this._hub.emitEvent("tickEmpty");
                        continue;
                    }
                    // this.waitingEntries
                    const batchLength = batch.length;
                    this.updateStatus(() => {
                        this.waitingEntries += batchLength;
                    });
                    await this._collected.post(batch);
                }
            } while (!this._isSuspended);
            this._hub.emitEvent("suspended");
            // Pump only ended at isSuspended.
        } finally {
            this._processing = false;
        }
    }

    _run(): void {
        if (this._isSuspended) return;
        if (this._processing) return;
        fireAndForget(() => this._process());
    }
    terminateAll(): void {
        this.root.terminate();
    }
    terminate(): void {
        if (this._pipeTo) {
            this._pipeTo.terminate();
            this._pipeTo = undefined;
        }
        this._isSuspended = true;
        this._enqueueProcessor = () => [];
        this._processor = () => Promise.resolve([]);
        this.clearQueue();
        this._hub.emitEvent("tickSuspended");
        this._hub.emitEvent("tickSuspended");
        this._hub.emitEvent("tickSuspended");
        this._collected.dispose();
        this._clerks.dispose();
        this._queue.length = 0;
        allRunningProcessors.delete(this);
    }
}

export function stopAllRunningProcessors(): void {
    const processors = [...allRunningProcessors];
    for (const processor of processors) {
        processor.terminate();
    }
}
