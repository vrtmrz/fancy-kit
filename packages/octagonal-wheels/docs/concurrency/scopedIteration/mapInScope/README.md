[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [scopedIteration](../README.md) / mapInScope

# Function: mapInScope()

```ts
function mapInScope<S, I, R>(
  parent: S,
  items: Iterable<I, any, any> | AsyncIterable<I, any, any>,
  options: IterationOptions,
  operation: (item: Awaited<I>, ctx: S, index: number) => Awaitable<R>,
): Promise<IterationMapResult<R>>;
```

Defined in: packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:69

Maps items in separate child scopes and returns results in input order.

## Type Parameters

| Type Parameter                                                |
| ------------------------------------------------------------- |
| `S` _extends_ [`IterationScope`](../IterationScope/README.md) |
| `I`                                                           |
| `R`                                                           |

## Parameters

| Parameter   | Type                                                                                                                           | Description                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `parent`    | `S`                                                                                                                            | The shared value and capabilities borrowed by each item scope.                     |
| `items`     | `Iterable`\<`I`, `any`, `any`\> \| `AsyncIterable`\<`I`, `any`, `any`\>                                                        | Sequentially pulled synchronous or asynchronous input; yielded values are awaited. |
| `options`   | [`IterationOptions`](../IterationOptions/README.md)                                                                            | A positive concurrency bound, including item cleanup; defaults to one.             |
| `operation` | (`item`: `Awaited`\<`I`\>, `ctx`: `S`, `index`: `number`) => [`Awaitable`](../../../resource/scope/Awaitable/README.md)\<`R`\> | Produces one value using the item's context and zero-based input index.            |

## Returns

`Promise`\<[`IterationMapResult`](../IterationMapResult/README.md)\<`R`\>\>

An explicit completion or cancellation result. Cancelled values cover
the started input prefix; unstarted items have no placeholders. Undefined remains data.

## Remarks

Admission, child cleanup, iterator closure, and error handling follow forEachInScope.
Started callbacks are awaited even after cancellation. If any fails, the operation
rejects after drainage instead of returning a partial success. Returned objects are
not cloned, and returning a resource does not transfer its deferred ownership.
