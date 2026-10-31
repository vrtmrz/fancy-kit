[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [semaphore](../README.md) / withSemaphore

# Function: withSemaphore()

```ts
function withSemaphore<T>(
  semaphore: Pick<SemaphoreObject, "acquire">,
  operation: () => T | PromiseLike<T>,
): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/concurrency/semaphore.scoped.ts:35

Runs an operation while holding one semaphore permit, releasing it afterwards.

Calls `semaphore.acquire()` with its original receiver and default quantity.
The operation starts only after acquisition succeeds. Its synchronous value or
asynchronous result is awaited before the acquired release function is called
exactly once, whether the operation succeeds or fails.

An acquisition failure propagates without calling the operation or a release
function. Operation failures propagate unchanged when release succeeds. Release
errors follow ordinary `finally` semantics and replace the result or error from
the operation. The supplied semaphore retains its queue and concurrency policy.

## Type Parameters

| Type Parameter | Description                    |
| -------------- | ------------------------------ |
| `T`            | The resolved operation result. |

## Parameters

| Parameter   | Type                                                                     | Description                                                                                        |
| ----------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `semaphore` | `Pick`\<[`SemaphoreObject`](../SemaphoreObject/README.md), `"acquire"`\> | An existing semaphore or injected acquisition capability.                                          |
| `operation` | () => `T` \| `PromiseLike`\<`T`\>                                        | Work to start after acquisition; pass a callback so work does not start before the permit is held. |

## Returns

`Promise`\<`T`\>

A promise for the operation result, settled after release.

## Example

```ts
import {
  Semaphore,
  withSemaphore,
} from "octagonal-wheels/concurrency/semaphore";

declare function fetchRecord(): Promise<{ id: string }>;

const semaphore = Semaphore(3);
const record = await withSemaphore(semaphore, () => fetchRecord());
```
