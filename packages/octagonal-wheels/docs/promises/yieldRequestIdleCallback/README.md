[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [promises](../README.md) / yieldRequestIdleCallback

# Function: yieldRequestIdleCallback()

```ts
function yieldRequestIdleCallback(options?: IdleRequestOptions): Promise<void>;
```

Defined in: [src/promises.ts:118](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L118)

A utility function that wraps the `requestIdleCallback` function and returns a promise.
If `requestIdleCallback` is not available in the global scope (iOS, Safari), it falls back to `yieldMicrotask`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | `IdleRequestOptions` | The options to be passed to the `requestIdleCallback` function. |

## Returns

`Promise`\<`void`\>

A promise that resolves when the idle callback is executed.
