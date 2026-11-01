[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / delay

# Function: delay()

```ts
function delay<T>(ms: number, result?: T): Promise<T>;
```

Defined in: packages/octagonal-wheels/src/promises.ts:7

Delays the execution of a function by the specified number of milliseconds.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type     | Description                                                    |
| --------- | -------- | -------------------------------------------------------------- |
| `ms`      | `number` | The number of milliseconds to delay the execution.             |
| `result?` | `T`      | The optional result value to be resolved with after the delay. |

## Returns

`Promise`\<`T`\>

A promise that resolves with the specified result value after the delay.
