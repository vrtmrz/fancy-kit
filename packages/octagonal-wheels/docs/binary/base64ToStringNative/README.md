[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / base64ToStringNative

# Function: base64ToStringNative()

```ts
function base64ToStringNative(base64: string | string[]): string;
```

Defined in: [src/binary/base64.ts:332](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/base64.ts#L332)

Converts a base64 string or an array of base64 strings to a regular string using native methods.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `base64` | `string` \| `string`[] | The base64 string or an array of base64 strings to convert. |

## Returns

`string`

The converted regular string.

## Remarks

This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
