import { TIMED_OUT_SIGNAL } from '../promises.js';
import { shareRunningResult } from './lock_v2.js';
import { globalSlipBoard } from '../bureau/SlipBoard.js';

function unwrapTaskResult(result) {
    if ("ok" in result)
        return result.ok;
    if ("err" in result)
        return result.err;
    throw new Error("Argument Exception: Could not unwrap");
}
function isTaskWaiting(task) {
    if (task instanceof Promise) {
        return false;
    }
    if (task instanceof Function) {
        return true;
    }
    throw new Error("Invalid state");
}
async function wrapEachProcess(key, task) {
    try {
        const r = await task;
        return { key, ok: r };
    }
    catch (ex) {
        return { key, err: ex instanceof Error ? ex : new Error(`${ex}`) };
    }
}
/**
 * Perform all tasks within given concurrency.
 * @param limit Concurrency limit
 * @param tasks Tasks to perform all
 *
 */
async function* processAllGeneratorTasksWithConcurrencyLimit(limit, tasks) {
    const nowProcessing = new Map();
    let idx = 0;
    // for await (const task of tasks){
    let generatorDone = false;
    while (nowProcessing.size > 0 || !generatorDone) {
        L2: while (nowProcessing.size < limit && !generatorDone) {
            const w = await tasks.next();
            if (w.done) {
                generatorDone = true;
                // break L2;
            }
            if (w.value === undefined) {
                break L2;
            }
            const task = w.value;
            idx++;
            const newProcess = isTaskWaiting(task) ? task() : task;
            const wrappedPromise = wrapEachProcess(idx, newProcess);
            nowProcessing.set(idx, wrappedPromise);
        }
        const done = await Promise.race(nowProcessing.values());
        nowProcessing.delete(done.key);
        yield done;
    }
}
async function* pipeGeneratorToGenerator(generator, callback) {
    for await (const e of generator) {
        const closure = () => callback(e);
        yield closure;
    }
}
function* pipeArrayToGenerator(array, callback) {
    for (const e of array) {
        const closure = () => callback(e);
        yield closure;
    }
}
/**
 * Perform all tasks within given concurrency.
 * @param limit Concurrency limit
 * @param tasks Tasks to perform all
 *
 */
async function* processAllTasksWithConcurrencyLimit(limit, tasks) {
    const nowProcessing = new Map();
    let idx = 0;
    const pendingTasks = tasks.reverse();
    while (pendingTasks.length > 0 || nowProcessing.size > 0) {
        L2: while (nowProcessing.size < limit && pendingTasks.length > 0) {
            const task = pendingTasks.pop(); // Pop is faster than shift.
            if (task === undefined) {
                break L2;
            }
            idx++;
            const newProcess = isTaskWaiting(task) ? task() : task;
            const wrappedPromise = wrapEachProcess(idx, newProcess);
            nowProcessing.set(idx, wrappedPromise);
        }
        const done = await Promise.race(nowProcessing.values());
        nowProcessing.delete(done.key);
        yield done;
    }
}
/**
 * Perform all tasks and returns all result by keeping the order.
 * @param limit Concurrency limit
 * @param tasks Tasks to perform all
 * @returns
 */
async function mapAllTasksWithConcurrencyLimit(limit, tasks) {
    const results = new Map();
    for await (const v of processAllTasksWithConcurrencyLimit(limit, tasks)) {
        results.set(v.key, v);
    }
    const ret = [...results.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
    return ret;
}
const tasks = new Map();
function scheduleTask(key, timeout, proc, skipIfTaskExist) {
    if (tasks.has(key)) {
        if (skipIfTaskExist)
            return;
        cancelTask(key);
    }
    const newTask = setTimeout(() => {
        tasks.delete(key);
        void proc();
    }, timeout);
    tasks.set(key, newTask);
}
function cancelTask(key) {
    const old = tasks.get(key);
    if (old) {
        clearTimeout(old);
        tasks.delete(key);
    }
}
function cancelAllTasks() {
    for (const v of tasks.keys()) {
        cancelTask(v);
    }
}
const intervals = {};
function setPeriodicTask(key, timeout, proc) {
    cancelPeriodicTask(key);
    intervals[key] = setInterval(() => {
        void proc();
    }, timeout);
}
function cancelPeriodicTask(key) {
    if (key in intervals) {
        clearInterval(intervals[key]);
        delete intervals[key];
    }
}
function cancelAllPeriodicTask() {
    for (const v in intervals) {
        cancelPeriodicTask(v);
    }
}
const waitingItems = new Set();
async function waitForTimeout(key, timeout) {
    return await shareRunningResult(key, async () => {
        waitingItems.add(key);
        try {
            const ret = await globalSlipBoard.awaitNext("wait-for-timeout", key, { timeout });
            if (ret === TIMED_OUT_SIGNAL)
                return true;
            return ret;
        }
        finally {
            waitingItems.delete(key);
        }
    });
}
function finishWaitingForTimeout(key, hasTimeout = false) {
    globalSlipBoard.submit("wait-for-timeout", key, !!hasTimeout);
}
function finishAllWaitingForTimeout(prefix, hasTimeout) {
    void globalSlipBoard.submitToAll("wait-for-timeout", prefix, !!hasTimeout);
}
function isWaitingForTimeout(key) {
    return waitingItems.has(key);
}
/**
 * @deprecated
 * Use shareRunningResult instead.
 * @param key
 * @param proc
 * @returns
 */
function sharedTask(key, proc) {
    return shareRunningResult(key, proc);
}
function wrapFunctionAsShared(proc) {
    return async (...p) => {
        const key = proc.name + "-" + p.map((e) => (typeof e === "object" ? JSON.stringify(e) : `${e}`)).join(",");
        return await shareRunningResult(key, () => proc(...p));
    };
}

export { cancelAllPeriodicTask, cancelAllTasks, cancelPeriodicTask, cancelTask, finishAllWaitingForTimeout, finishWaitingForTimeout, isWaitingForTimeout, mapAllTasksWithConcurrencyLimit, pipeArrayToGenerator, pipeGeneratorToGenerator, processAllGeneratorTasksWithConcurrencyLimit, processAllTasksWithConcurrencyLimit, scheduleTask, setPeriodicTask, sharedTask, unwrapTaskResult, waitForTimeout, wrapFunctionAsShared };
//# sourceMappingURL=task.js.map
