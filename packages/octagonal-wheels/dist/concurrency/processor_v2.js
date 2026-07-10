import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { RESULT_TIMED_OUT } from '../common/const.js';
import { promiseWithResolvers, noop, cancelableDelay, delay, fireAndForget } from '../promises.js';
import { EventHub } from '../events/EventHub.js';
import { PaceMaker } from '../bureau/PaceMaker.js';
import { ClerkGroup, Clerk } from '../bureau/Clerk.js';
import { Inbox } from '../bureau/Inbox.js';

/**
 * @deprecated Use EventHub and waitFor instead.
 */
class Notifier {
    constructor() {
        Object.defineProperty(this, "_p", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: promiseWithResolvers()
        });
        Object.defineProperty(this, "isUsed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    notify() {
        if (!this.isUsed) {
            return;
        }
        this.isUsed = false;
        void this._p.promise.finally(noop);
        this._p.resolve();
        this._p = promiseWithResolvers();
    }
    get nextNotify() {
        this.isUsed = true;
        return this._p.promise;
    }
}
const allRunningProcessors = new Set([]);
class QueueProcessor {
    get nowProcessing() {
        return this.processingEntities;
    }
    get totalNowProcessing() {
        return this.nowProcessing + (this._pipeTo?.totalNowProcessing || 0);
    }
    get remaining() {
        return this._queue.length + this.processingEntities + this.waitingEntries;
    }
    get totalRemaining() {
        return this.remaining + (this._pipeTo?.totalRemaining || 0);
    }
    updateStatus(setFunc) {
        setFunc();
        this._updateReactiveSource();
    }
    suspend() {
        this._isSuspended = true;
        this._hub.emitEvent("tickSuspended");
        return this;
    }
    resume() {
        this._isSuspended = false;
        this._hub.emitEvent("tickResumed");
        return this;
    }
    resumePipeLine() {
        this._pipeTo?.resumePipeLine();
        this.resume();
        return this;
    }
    startPipeline() {
        this.root.resumePipeLine();
        return this;
    }
    get root() {
        if (this._root === undefined) {
            return this;
        }
        return this._root;
    }
    _initEventHub() {
        this._hub.onEvent("tickResumed", () => this._run());
    }
    async _waitFor(keys, timeout) {
        const items = keys.map((key) => {
            const p = promiseWithResolvers();
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
        items.forEach((i) => i.resolve(undefined));
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
        }
        else {
            if (!this.delay) {
                this._clearTickDelay();
                this._hub.emitEvent("tickDelayTimeout");
                return;
            }
            if (this._delayTimer) ;
            else {
                this._triggerTickDelay();
            }
        }
    }
    constructor(processor, params, items, enqueueProcessor) {
        Object.defineProperty(this, "_queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_processor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_enqueueProcessor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (queue, entity) => (queue.push(entity), queue)
        });
        Object.defineProperty(this, "_isSuspended", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        Object.defineProperty(this, "_nextProcessNeedsImmediate", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_pipeTo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_root", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        Object.defineProperty(this, "_remainingReactiveSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_totalRemainingReactiveSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_processingEntitiesReactiveSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_keepResultUntilDownstreamConnected", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_keptResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_runOnUpdateBatch", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => { }
        });
        // Parameters
        // How many processes running concurrently
        Object.defineProperty(this, "concurrentLimit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        // How many entries processed at once
        Object.defineProperty(this, "batchSize", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        // How many entries kept in before the delay
        Object.defineProperty(this, "yieldThreshold", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        // If set, wait for set milliseconds after enqueued
        // Note: If reached to the batchSize, run immediately
        Object.defineProperty(this, "delay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "maintainDelay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "interval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        // This means numbers of the entities which are now processing
        Object.defineProperty(this, "processingEntities", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        // This means numbers of the entries which dequeued from the queue but not processed yet.
        Object.defineProperty(this, "waitingEntries", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        // Event Hub
        Object.defineProperty(this, "_hub", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new EventHub()
        });
        Object.defineProperty(this, "_delayTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_intervalPaceMaker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_processingBatches", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set()
        });
        Object.defineProperty(this, "addProcessingBatch", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (value) => {
                const r = this._processingBatches.add(value);
                this._updateBatchProcessStatus();
                return r;
            }
        });
        Object.defineProperty(this, "deleteProcessingBatch", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (value) => {
                const r = this._processingBatches.delete(value);
                this._updateBatchProcessStatus();
                return r;
            }
        });
        Object.defineProperty(this, "_processing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_collected", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_clerks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_processCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
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
        if (params?.remainingReactiveSource)
            this._remainingReactiveSource = params?.remainingReactiveSource;
        if (params?.totalRemainingReactiveSource)
            this._totalRemainingReactiveSource = params?.totalRemainingReactiveSource;
        if (params?.processingEntitiesReactiveSource)
            this._processingEntitiesReactiveSource = params?.processingEntitiesReactiveSource;
        if (params?.suspended !== undefined)
            this._isSuspended = params?.suspended;
        if (enqueueProcessor)
            this.replaceEnqueueProcessor(enqueueProcessor);
        if (params?.pipeTo !== undefined) {
            this.pipeTo(params.pipeTo);
        }
        this._intervalPaceMaker = new PaceMaker(this.interval);
        if (items)
            this.enqueueAll(items);
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
    replaceEnqueueProcessor(processor) {
        this._enqueueProcessor = processor;
        return this;
    }
    /**
     * Modify the queue by force.
     * @param processor
     * @remarks I know that you have known this is very dangerous.
     */
    modifyQueue(processor) {
        this._queue = processor(this._queue);
        this._onTick();
    }
    /**
     * Clear the queue
     * @remarks I know that you have known this is very dangerous.
     */
    clearQueue() {
        this._queue = [];
        this._onTick();
    }
    /**
     * Set the handler for when the queue has been modified
     * @param proc
     * @returns
     */
    onUpdateProgress(proc) {
        this._runOnUpdateBatch = proc;
        return this;
    }
    /**
     * Join another processor
     * @param pipeTo
     * @returns
     */
    pipeTo(pipeTo) {
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
    isIdle() {
        return this._isIdle() && (!this._pipeTo ? true : this._pipeTo.isIdle());
    }
    _isIdle() {
        return this.totalRemaining == 0;
    }
    async _waitForIdle() {
        if (this._isSuspended)
            return Promise.resolve();
        if (this._isIdle())
            return Promise.resolve();
        do {
            const r = await this._waitFor(["tickEmpty", "tick", "tickSuspended", "suspended", "idle"]);
            if (r === "tickSuspended")
                break;
            if (r == "suspended")
                break;
            if (r == "tickEmpty")
                break;
            if (r == "idle")
                break;
        } while (!this._isIdle());
        return Promise.resolve();
    }
    idleDetectors() {
        const thisPromise = this._waitForIdle();
        if (this._pipeTo) {
            return [thisPromise, ...this._pipeTo.idleDetectors()];
        }
        return [thisPromise];
    }
    get isSuspended() {
        return this._isSuspended || this._pipeTo?.isSuspended || false;
    }
    _updateReactiveSource() {
        this.root.updateReactiveSource();
    }
    updateReactiveSource() {
        if (this._pipeTo) {
            this._pipeTo.updateReactiveSource();
        }
        if (this._remainingReactiveSource)
            this._remainingReactiveSource.value = this.remaining;
        if (this._totalRemainingReactiveSource)
            this._totalRemainingReactiveSource.value = this.totalRemaining;
        if (this._processingEntitiesReactiveSource)
            this._processingEntitiesReactiveSource.value = this.nowProcessing;
    }
    _updateBatchProcessStatus() {
        this._updateReactiveSource();
        this._runOnUpdateBatch();
    }
    _collectBatch() {
        return this._queue.splice(0, this.batchSize);
    }
    _canCollectBatch() {
        return this._queue.length !== 0;
    }
    enqueue(entity) {
        this._queue = this._enqueueProcessor(this._queue, entity);
        this._updateBatchProcessStatus();
        this._onTick();
        return this;
    }
    enqueueAll(entities) {
        let queue = this._queue;
        for (const v of entities) {
            queue = this._enqueueProcessor(queue, v);
        }
        this._queue = queue;
        this._updateBatchProcessStatus();
        this._onTick();
        return this;
    }
    requestNextFlush() {
        // if (this._canCollectBatch()) {
        this._nextProcessNeedsImmediate = true;
        this._onTick();
        // }
    }
    async _waitForSuspended() { }
    flush() {
        if (this._isSuspended)
            return Promise.resolve(false);
        this.requestNextFlush();
        return this.waitForAllDownstream();
    }
    async waitForAllDownstream(timeout) {
        // Prepare timeout detector
        const baseTasks = [];
        if (timeout) {
            baseTasks.push(delay(timeout, RESULT_TIMED_OUT));
        }
        do {
            const idleTasks = this.idleDetectors();
            const tasks = [...baseTasks, Promise.all(idleTasks)];
            const ret = await Promise.race(tasks);
            if (ret === RESULT_TIMED_OUT)
                return false;
        } while (!this.isIdle());
        return true;
    }
    waitForAllProcessed(timeout) {
        this.root.startPipeline();
        return this.root.waitForAllDownstream(timeout);
    }
    async waitForAllDoneAndTerminate(timeout) {
        this.root.startPipeline();
        const r = await this.root.waitForAllDownstream(timeout);
        this.terminateAll();
        return r;
    }
    async _runProcessor(items) {
        // runProcessor does not modify queue. so updateStatus should only update about reactiveSource.
        const ret = await this._processor(items);
        if (!ret)
            return;
        // If downstream is connected, the result sent to that.
        if (this._pipeTo) {
            this._pipeTo.enqueueAll(ret);
        }
        else if (this._keepResultUntilDownstreamConnected) {
            // Buffer the result if downstream is not connected.
            this._keptResult.push(...ret);
        }
    }
    async *pump() {
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
                if (items.length == 0)
                    break L2;
                yield items;
            } while (this._canCollectBatch());
            if (ticked == "tickSuspended")
                break;
        } while (!this._isSuspended);
    }
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
                }
                catch (ex) {
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
    async _process() {
        if (this._processing || this._isSuspended)
            return;
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
        }
        finally {
            this._processing = false;
        }
    }
    _run() {
        if (this._isSuspended)
            return;
        if (this._processing)
            return;
        fireAndForget(() => this._process());
    }
    terminateAll() {
        this.root.terminate();
    }
    terminate() {
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
function stopAllRunningProcessors() {
    const processors = [...allRunningProcessors];
    for (const processor of processors) {
        processor.terminate();
    }
}

export { Notifier, QueueProcessor, stopAllRunningProcessors };
//# sourceMappingURL=processor_v2.js.map
