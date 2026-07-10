[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [promises](../README.md) / cancelableDelay

# Function: cancelableDelay()

```ts
function cancelableDelay<T>(timeout: number, cancel?: T): {
  promise: Promise<T>;
  cancel: void;
};
```

Defined in: [src/promises.ts:172](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L172)

Creates a delay that can be canceled.

## Type Parameters

| Type Parameter | Default type | Description |
| ------ | ------ | ------ |
| `T` | *typeof* [`TIMED_OUT_SIGNAL`](../TIMED_OUT_SIGNAL-1/README.md) | The type of the cancel signal. |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `timeout` | `number` | The delay duration in milliseconds. |
| `cancel?` | `T` | The value to resolve the promise with if the delay is canceled. |

## Returns

```ts
{
  promise: Promise<T>;
  cancel: void;
}
```

An object containing the promise and a cancel function.

### promise

```ts
promise: Promise<T> = promise.promise;
```

### cancel()

```ts
cancel(): void;
```

#### Returns

`void`
