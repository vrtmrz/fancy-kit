import type { RpcScheduler } from "../../src/types.js";

interface ScheduledTask {
  readonly id: number;
  readonly runAt: number;
  readonly callback: () => void;
  cancelled: boolean;
}

/**
 * Deterministic in-memory scheduler implementing {@link RpcScheduler} without
 * touching global host timers.
 */
export interface ControllableScheduler extends RpcScheduler {
  /** Current simulated clock time in milliseconds. */
  readonly now: number;
  /** Number of active, uncancelled timers awaiting execution. */
  readonly pendingCount: number;
  /** Advances the clock by `ms` milliseconds and executes due timers in order. */
  advanceBy(ms: number): number;
  /** Advances to and runs the earliest pending timer, returning `true` if one ran. */
  runNext(): boolean;
  /** Runs all pending timers in chronological order, throwing if a cycle exceeds `limit`. */
  runAll(limit?: number): number;
  /** Cancels all pending timers and stops scheduling further callbacks. */
  dispose(): void;
}

/**
 * Creates a deterministic scheduler for RPC deadline and delay tests.
 */
export function createControllableScheduler(): ControllableScheduler {
  let currentTime = 0;
  let nextId = 1;
  let disposed = false;
  const tasks: ScheduledTask[] = [];

  function removeCancelledAndPickNext(): ScheduledTask | undefined {
    let earliestIndex = -1;
    for (let index = tasks.length - 1; index >= 0; index--) {
      const candidate = tasks[index]!;
      if (candidate.cancelled) {
        tasks.splice(index, 1);
        continue;
      }
      if (
        earliestIndex === -1 ||
        candidate.runAt < tasks[earliestIndex]!.runAt ||
        (candidate.runAt === tasks[earliestIndex]!.runAt &&
          candidate.id < tasks[earliestIndex]!.id)
      ) {
        earliestIndex = index;
      }
    }
    if (earliestIndex === -1) return undefined;
    return tasks[earliestIndex];
  }

  function popTask(target: ScheduledTask): void {
    const index = tasks.indexOf(target);
    if (index !== -1) {
      tasks.splice(index, 1);
    }
  }

  return {
    get now(): number {
      return currentTime;
    },
    get pendingCount(): number {
      return tasks.filter((task) => !task.cancelled).length;
    },
    setTimeout(callback: () => void, delayMs: number): () => void {
      if (disposed) {
        return () => undefined;
      }
      const normalisedDelay = Number.isFinite(delayMs) && delayMs > 0 ? delayMs : 0;
      const task: ScheduledTask = {
        id: nextId++,
        runAt: currentTime + normalisedDelay,
        callback,
        cancelled: false,
      };
      tasks.push(task);
      return () => {
        task.cancelled = true;
        popTask(task);
      };
    },
    advanceBy(ms: number): number {
      if (ms < 0 || !Number.isFinite(ms)) {
        throw new RangeError("advanceBy requires a finite non-negative duration.");
      }
      const targetTime = currentTime + ms;
      let executed = 0;
      while (!disposed) {
        const nextTask = removeCancelledAndPickNext();
        if (!nextTask || nextTask.runAt > targetTime) {
          break;
        }
        popTask(nextTask);
        currentTime = Math.max(currentTime, nextTask.runAt);
        executed++;
        nextTask.callback();
      }
      if (!disposed) {
        currentTime = targetTime;
      }
      return executed;
    },
    runNext(): boolean {
      if (disposed) return false;
      const nextTask = removeCancelledAndPickNext();
      if (!nextTask) return false;
      popTask(nextTask);
      currentTime = Math.max(currentTime, nextTask.runAt);
      nextTask.callback();
      return true;
    },
    runAll(limit = 10_000): number {
      let executed = 0;
      while (this.runNext()) {
        executed++;
        if (executed >= limit) {
          throw new Error(`ControllableScheduler exceeded max task limit (${limit}).`);
        }
      }
      return executed;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const task of tasks) {
        task.cancelled = true;
      }
      tasks.length = 0;
    },
  };
}
