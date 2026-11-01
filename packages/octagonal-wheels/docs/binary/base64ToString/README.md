[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [binary](../README.md) / base64ToString

# Variable: base64ToString

```ts
const base64ToString: (base64: string | string[]) => string;
```

Defined in: packages/octagonal-wheels/src/binary/base64.ts:322

Converts a base64 string or an array of base64 strings to a regular string.

Converts a base64 string or an array of base64 strings to a regular string using native methods.

## Parameters

| Parameter | Type                   | Description                                                 |
| --------- | ---------------------- | ----------------------------------------------------------- |
| `base64`  | `string` \| `string`[] | The base64 string or an array of base64 strings to convert. |

## Returns

`string`

The converted regular string.

## Remarks

This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.

## Param

**base64**

The base64 string or an array of base64 strings to convert.

## Returns

The converted regular string.

## Remarks

This function is used to convert base64 strings to binary strings. And if failed, it returns the original string.
