[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [resource](../README.md) / createOwnedResource

# Function: createOwnedResource()

```ts
function createOwnedResource<T>(
  value: T,
  release: (value: T) => void | Promise<void>,
): OwnedResource<T>;
```

Defined in: packages/octagonal-wheels/src/resource.ts:47

Pairs an existing value with cleanup that runs at most once.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                                            | Description                                                          |
| --------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `value`   | `T`                                             | The value whose lifetime the caller owns; its identity is preserved. |
| `release` | (`value`: `T`) => `void` \| `Promise`\<`void`\> | Cleanup for this value and its owned dependencies.                   |

## Returns

[`OwnedResource`](../OwnedResource/README.md)\<`T`\>

An ownership wrapper; creating it does not invoke cleanup or modify the value.

## Remarks

The first dispose call invokes release synchronously. Once that call returns,
later calls return the same completion promise or undefined, or rethrow the
same synchronous failure. A rejected promise is retained without retrying.
Reentrant disposal cannot invoke release again.

Pass only the value to borrowers and keep the wrapper with the owner. Cleanup
must release only owned dependencies. Disposal does not revoke references to
the value, flush buffered work, or infer how the value should be closed.
