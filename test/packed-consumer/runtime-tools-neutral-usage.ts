import { createOwnedResource, withOwnedResource, type DisposableResource, type OwnedResource } from "octagonal-wheels/resource";
import { createOwnedResource as createOwnedResourceAlias } from "octagonal-wheels/resource.js";
import { createDeferredAction } from "octagonal-wheels/concurrency/deferredAction";
import { withCounting, type MutableCount } from "octagonal-wheels/concurrency/counting";
import { withCounting as withCountingAlias } from "octagonal-wheels/concurrency/counting.js";
import { createCoalescingNotifier, type CoalescingNotifier } from "octagonal-wheels/concurrency/coalescingNotifier";
import { createCoalescingNotifier as createNotifierAlias } from "octagonal-wheels/concurrency/coalescingNotifier.js";
import { formatDuration } from "octagonal-wheels/notation/duration";
import { formatDuration as categoryDuration } from "octagonal-wheels/notation";
import { cloneViaJSON } from "octagonal-wheels/encoding/json";
import { cloneViaJSON as categoryClone } from "octagonal-wheels/encoding";
import { findPathComponentsExceedingUtf8Limit } from "octagonal-wheels/path";
import { splitDelimitedList, joinDelimitedList } from "octagonal-wheels/string";
import { stepCyclicIndex } from "octagonal-wheels/collection";

const counter: MutableCount = { value: 0 };
const counted: Promise<string> = withCounting(counter, () => "done");
const countedAlias: Promise<number> = withCountingAlias(counter, async () => 42);
const notifier: CoalescingNotifier<{ count: number }> = createCoalescingNotifier({
  everyCount: 100, maxWaitMs: 2000, leading: true,
  getCount: value => value.count,
  onNotify: value => { const count: number = value.count; void count; },
  scheduleTimeout: (_callback, _delayMs) => () => {},
});
notifier.update({ count: 1 });
notifier.flush();
notifier.dispose();
createNotifierAlias<number>({ everyCount: 2, onNotify: () => {} }).dispose();
const text: string = formatDuration(60_000);
const categoryText: string = categoryDuration(60_000);
const cloned: unknown = cloneViaJSON({ x: 1 });
const categoryCloned: unknown = categoryClone({ x: 1 });
const oversized: { component: string; utf8Bytes: number }[] = findPathComponentsExceedingUtf8Limit("folder/file", 255);
const items: string[] = splitDelimitedList("a|b", "|");
const joined: string = joinDelimitedList(items, "|");
const index: number = stepCyclicIndex(-1, 3, "prev");
void [counted, countedAlias, text, categoryText, cloned, categoryCloned, oversized, joined, index];

const originalType: { x: number } = cloneViaJSON({ x: 1 });
// @ts-expect-error A notification must match its payload type.
notifier.update(1);
// @ts-expect-error A counting scope requires a numeric mutable value.
withCounting({ value: "0" }, () => {});
// @ts-expect-error The direction is explicit.
stepCyclicIndex(0, 3, "forward");
void originalType;


const log = (message: string): void => { void message; };
const ownedLog: OwnedResource<typeof log> = createOwnedResource(log, value => {
  const original: typeof log = value;
  void original;
});
const logged: Promise<number> = withOwnedResource(ownedLog, resource => {
  resource.value("entry");
  return 1;
});
const ownedAlias: OwnedResource<number> = createOwnedResourceAlias(42, async value => { void value; });
const cleanup: DisposableResource[] = [ownedLog, ownedAlias, notifier, createDeferredAction(() => {})];
void [logged, cleanup];
// @ts-expect-error Borrowed log functions do not expose cleanup.
ownedLog.value.dispose();
// @ts-expect-error The owned value cannot be replaced.
ownedLog.value = log;
// @ts-expect-error A scope requires an explicit cleanup capability.
withOwnedResource({ value: log }, () => {});
// @ts-expect-error Cleanup must complete synchronously or with a void promise.
createOwnedResource(log, async () => 42);
