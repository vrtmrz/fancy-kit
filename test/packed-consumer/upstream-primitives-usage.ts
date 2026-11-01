import { withLocks } from "octagonal-wheels/concurrency/lock";
import { withLocks as aliasLock } from "octagonal-wheels/concurrency/lock.js";

const keys: readonly string[] = ["a", "b"];
const locked: Promise<number> = withLocks(keys, async () => 42);
const aliased: Promise<string> = aliasLock([], async () => "done");
// @ts-expect-error Lock keys use strings in a caller-defined common order.
withLocks([Symbol()], async () => {});
// @ts-expect-error The callback result is retained in the returned promise.
const wrongResult: Promise<string> = withLocks(keys, async () => 42);
void [locked, aliased, wrongResult];
