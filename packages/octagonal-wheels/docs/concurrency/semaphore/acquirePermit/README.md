[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [semaphore](../README.md) / acquirePermit

# Function: acquirePermit()

```ts
function acquirePermit(
  semaphore: SemaphoreAcquisition,
): <T>(ctx: Scope<T>) => Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.scoped.ts:82

Creates a generic preparation step which acquires and defers one permit.

The acquisition method is called with its original receiver and no arguments.
Once acquisition succeeds, its release function is registered immediately on
the supplied scope. Acquisition failures propagate without registering a
cleanup. The returned step preserves the current scope value unchanged. It
acquires a permit from the supplied semaphore instance and defers its release
on the supplied scope; it does not create or manage a semaphore. Use this step
before other preparation whose resources should be released before the permit.
Waiting for an existing acquisition is not abortable.

## Parameters

| Parameter   | Type                                                        | Description                               |
| ----------- | ----------------------------------------------------------- | ----------------------------------------- |
| `semaphore` | [`SemaphoreAcquisition`](../SemaphoreAcquisition/README.md) | The semaphore used to acquire one permit. |

## Returns

A generic scope step which resolves to its unchanged value.

\<`T`\>(`ctx`: [`Scope`](../../../resource/scope/Scope/README.md)\<`T`\>) => `Promise`\<`T`\>

## Example

```ts
import { Semaphore, acquirePermit } from "./semaphore.ts";
import { withScope } from "../resource/scope.ts";

const semaphore = Semaphore(3);
const result = await withScope("work", acquirePermit(semaphore));
// The permit is released when the supplied scope closes.
```
