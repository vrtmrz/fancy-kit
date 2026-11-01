import { Semaphore, withSemaphore, type SemaphoreObject } from "octagonal-wheels/concurrency/semaphore";
import { withSemaphore as withAlias } from "octagonal-wheels/concurrency/semaphore.js";

const semaphore: SemaphoreObject = Semaphore(2);
const result: Promise<number> = withSemaphore(semaphore, () => 42);
const injected: Promise<string> = withAlias({ acquire: async () => () => {} }, async () => "done");
void [result, injected];
