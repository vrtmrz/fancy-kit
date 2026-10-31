[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [messagepassing](../../README.md) / [signal](../README.md) / sendValue

# Function: sendValue()

```ts
function sendValue<T>(id: string, result: T): void;
```

Defined in: packages/octagonal-wheels/src/bureau/SlipBoard.ts:258

Sends a value to the specified ID.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type     | Description                  |
| --------- | -------- | ---------------------------- |
| `id`      | `string` | The ID to send the value to. |
| `result`  | `T`      | The value to send.           |

## Returns

`void`
