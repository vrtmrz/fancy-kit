import { createNotifier, type Notifier } from "octagonal-wheels/concurrency/notifier";
import { createNotifier as createNotifierJs } from "octagonal-wheels/concurrency/notifier.js";

const notifier: Notifier = createNotifier();
const alias = createNotifierJs();
const current = notifier.wait();
if (notifier.wait() !== current) throw new Error("waiters should share a promise");
const { notify } = notifier;
notify();
void alias.wait().then(() => undefined);
alias.notify();
