import {
  createDeferredAction,
  type DeferredAction,
  type TimeoutScheduler,
} from "octagonal-wheels/concurrency/deferredAction";
import {
  createDeferredAction as createDeferredActionAlias,
  type TimeoutScheduler as TimeoutSchedulerAlias,
} from "octagonal-wheels/concurrency/deferredAction.js";
import { deferredAction } from "octagonal-wheels/concurrency";

const scheduled: (() => void)[] = [];
const schedule: TimeoutScheduler = (callback, delayMs) => {
  void delayMs;
  scheduled.push(callback);
  return () => {};
};
const scheduleAlias: TimeoutSchedulerAlias = schedule;
const scheduleCategory: deferredAction.TimeoutScheduler = scheduleAlias;
const focused: DeferredAction = createDeferredAction(() => {}, schedule);
const alias: DeferredAction = createDeferredActionAlias(
  () => {},
  scheduleAlias,
);
const category: deferredAction.DeferredAction = deferredAction.createDeferredAction(
  () => {},
  scheduleCategory,
);
for (const controller of [focused, alias, category]) {
  controller.schedule(25);
  controller.cancel();
  controller.dispose();
}

// @ts-expect-error The delay is a number of milliseconds.
focused.schedule("later");
// @ts-expect-error The callback must be callable.
createDeferredAction(1);
const invalidScheduler = () => 1;
// @ts-expect-error A scheduler returns a cancellation function.
createDeferredAction(() => {}, invalidScheduler);
