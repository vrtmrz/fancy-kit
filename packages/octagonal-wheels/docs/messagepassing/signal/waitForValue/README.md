[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [messagepassing](../../README.md) / [signal](../README.md) / waitForValue

# Function: waitForValue()

```ts
function waitForValue<T>(id: string, timeout?: number): Promise<WithTimeout<T>>;
```

Defined in: packages/octagonal-wheels/src/bureau/SlipBoard.ts:242

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `id`       | `string` |
| `timeout?` | `number` |

## Returns

`Promise`\<[`WithTimeout`](../WithTimeout/README.md)\<`T`\>\>
