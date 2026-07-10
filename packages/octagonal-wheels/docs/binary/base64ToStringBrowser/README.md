[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [binary](../README.md) / base64ToStringBrowser

# Function: base64ToStringBrowser()

```ts
function base64ToStringBrowser(base64: string | string[]): string;
```

Defined in: [src/binary/base64.ts:308](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/binary/base64.ts#L308)

Converts a base64 string or an array of base64 strings to a regular string in a browser environment.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `base64` | `string` \| `string`[] | The base64 string or an array of base64 strings to convert. |

## Returns

`string`

The converted regular string.

## Remarks

This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
