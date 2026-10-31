[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / extendableDelay

# Function: extendableDelay()

```ts
function extendableDelay<U>(
  timeout: number,
  cancel: U,
): ExtendableDelay<typeof TIMED_OUT_SIGNAL, U>;
```

Defined in: packages/octagonal-wheels/src/promises.ts:213

Creates an extendable delay that can be cancelled or extended.

## Type Parameters

| Type Parameter                                 | Default type                                                   | Description                    |
| ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `U` _extends_ `string` \| `number` \| `symbol` | _typeof_ [`TIMED_OUT_SIGNAL`](../TIMED_OUT_SIGNAL-1/README.md) | The type of the cancel signal, |

## Parameters

| Parameter | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| `timeout` | `number` | The initial timeout duration in milliseconds. |
| `cancel`  | `U`      | The signal to use when cancelling the delay.  |

## Returns

[`ExtendableDelay`](../ExtendableDelay/README.md)\<_typeof_ [`TIMED_OUT_SIGNAL`](../TIMED_OUT_SIGNAL-1/README.md), `U`\>

An object containing the promise, cancel function, and extend function.

## Throws

If the delay has already been resolved.
