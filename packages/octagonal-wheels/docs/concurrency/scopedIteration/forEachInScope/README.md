[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [scopedIteration](../README.md) / forEachInScope

# Function: forEachInScope()

```ts
function forEachInScope<S, I>(
  parent: S,
  items: Iterable<I, any, any> | AsyncIterable<I, any, any>,
  options: IterationOptions,
  operation: (item: Awaited<I>, ctx: S, index: number) => unknown,
): Promise<IterationResult>;
```

Defined in: packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:45

Runs items in separate child scopes with bounded concurrency.

## Type Parameters

| Type Parameter                                                |
| ------------------------------------------------------------- |
| `S` _extends_ [`IterationScope`](../IterationScope/README.md) |
| `I`                                                           |

## Parameters

| Parameter   | Type                                                                    | Description                                                                |
| ----------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `parent`    | `S`                                                                     | The shared value and capabilities borrowed by each item scope.             |
| `items`     | `Iterable`\<`I`, `any`, `any`\> \| `AsyncIterable`\<`I`, `any`, `any`\> | Input pulled sequentially. Each yielded value is awaited before dispatch.  |
| `options`   | [`IterationOptions`](../IterationOptions/README.md)                     | A positive concurrency bound, including item cleanup; defaults to one.     |
| `operation` | (`item`: `Awaited`\<`I`\>, `ctx`: `S`, `index`: `number`) => `unknown`  | Receives an item, its own cleanup context, and the zero-based input index. |

## Returns

`Promise`\<[`IterationResult`](../IterationResult/README.md)\>

Completion or cancellation status and the number of callbacks invoked.

## Remarks

The caller must await or return this promise before the parent scope ends. Each
child finishes cleanup before releasing its concurrency slot. Cancellation stops
new admission without discarding already started work or its errors. An uncaught
failure also stops admission; siblings finish without being forcibly cancelled.
A pending iterator pull or yielded promise is awaited before early iterator closure.
All started item scopes and iterator cleanup settle before this promise settles.
Single failures preserve identity. Multiple failures use AggregateError, ordered
by input failure, item index, and iterator-close failure. Callback return values
are discarded and do not determine application-level success or cancellation.
