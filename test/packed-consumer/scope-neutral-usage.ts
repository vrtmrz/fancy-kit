import { scoped, withScope } from "octagonal-wheels/resource/scope";
import { mapInScope } from "octagonal-wheels/concurrency/scopedIteration";
import {
  acquirePermit,
  type SemaphoreAcquisition,
} from "octagonal-wheels/concurrency/semaphore";

declare const semaphore: SemaphoreAcquisition;
const operation = scoped<{ count: number }>()
  .pipe(acquirePermit(semaphore))
  .pipeScoped((ctx) => {
    ctx.defer(() => undefined);
    return ctx.value.count;
  })
  .pipe((ctx) => ctx.value + 1);

export const result: Promise<number> = withScope({ count: 1 }, operation);
export const mapped = withScope({ suffix: "x" }, (ctx) =>
  mapInScope(
    ctx,
    [1, 2],
    { concurrency: 2 },
    (item, child) => `${item}${child.value.suffix}`,
  ),
);

// @ts-expect-error The neutral declaration graph does not supply DOM types.
type NoImplicitDOM = AbortSignal;
export type { NoImplicitDOM };
