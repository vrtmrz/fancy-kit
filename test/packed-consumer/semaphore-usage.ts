import { Semaphore, withSemaphore, type SemaphoreObject } from "octagonal-wheels/concurrency/semaphore";
import { withSemaphore as withAlias } from "octagonal-wheels/concurrency/semaphore.js";
import { semaphore as coordination } from "octagonal-wheels/concurrency";

const semaphore: SemaphoreObject = Semaphore(3);
const value: Promise<number> = withSemaphore(semaphore, () => 42);
const asynchronous: Promise<string> = withAlias(semaphore, async () => "stored");
const literal: Promise<"stored"> = coordination.withSemaphore(semaphore, () => "stored" as const);
const injected: Promise<void> = withSemaphore({ acquire: async () => () => {} }, () => {});
declare const thenable: PromiseLike<string>;
const resolved: Promise<string> = withSemaphore(semaphore, () => thenable);
void [value, asynchronous, literal, injected, resolved];

// @ts-expect-error Work must be a callback which starts after acquisition.
withSemaphore(semaphore, Promise.resolve(1));
// @ts-expect-error Acquisition must return a release function.
withSemaphore({ acquire: async () => 42 }, () => {});
// @ts-expect-error The operation's resolved result remains a number.
const invalidResult: Promise<string> = withSemaphore(semaphore, () => 42);
void invalidResult;
