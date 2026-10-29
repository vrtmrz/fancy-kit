import { serializedByKeys } from "octagonal-wheels/concurrency/lock";
import { serializedByKeys as aliasLock } from "octagonal-wheels/concurrency/lock.js";

const keys: readonly string[] = ["a", "b"];
const locked: Promise<number> = serializedByKeys(keys, async () => 42);
const aliased: Promise<string> = aliasLock([], async () => "done");
// @ts-expect-error Lock keys use strings in a caller-defined common order.
serializedByKeys([Symbol()], async () => {});
// @ts-expect-error The callback result is retained in the returned promise.
const wrongResult: Promise<string> = serializedByKeys(keys, async () => 42);
void [locked, aliased, wrongResult];
