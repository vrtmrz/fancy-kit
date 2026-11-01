[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [function](../README.md) / onlyWhenChanged

# Function: onlyWhenChanged()

```ts
function onlyWhenChanged<T>(func: (arg: T) => void): (arg: T) => void;
```

Defined in: packages/octagonal-wheels/src/function.ts:48

Invoke a callback only when its argument differs from the last remembered value.

Each wrapper starts with `undefined` and uses strict equality (`===`). An
initial `undefined` is skipped; `NaN` always invokes the callback, signed
zeros compare equal, and objects are compared by identity. Only the last
value is retained, so returning to an earlier value invokes the callback.

The value is remembered immediately after the callback returns synchronously.
A synchronous exception propagates without replacing the previous value.
Callback results are discarded, so the wrapper does not return a callback's
promise. Promises are not awaited or rejection-handled; if one rejects later,
the remembered value remains. Handle promise rejections inside the callback.
State is private to each wrapper.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter | Type                   | Description                                                    |
| --------- | ---------------------- | -------------------------------------------------------------- |
| `func`    | (`arg`: `T`) => `void` | Callback whose consecutive duplicate arguments are suppressed. |

## Returns

A function with an independent last-argument value.

(`arg`: `T`) => `void`
