import {
  createDeferredAction,
  type DeferredAction,
  type TimeoutScheduler,
} from "octagonal-wheels/concurrency/deferredAction";
import { createDeferredAction as createAlias } from "octagonal-wheels/concurrency/deferredAction.js";

const schedule: TimeoutScheduler = (_callback, _delayMs) => () => {};
const controller: DeferredAction = createDeferredAction(
  () => {},
  schedule,
);
const alias: DeferredAction = createAlias(() => {});
controller.schedule(25);
controller.cancel();
controller.dispose();
alias.dispose();
