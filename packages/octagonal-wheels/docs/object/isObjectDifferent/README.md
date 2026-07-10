[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [object](../README.md) / isObjectDifferent

# Function: isObjectDifferent()

```ts
function isObjectDifferent(
   a: any, 
   b: any, 
   ignoreUndefined: boolean): boolean;
```

Defined in: [src/object.ts:29](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/object.ts#L29)

Checks if two objects are different.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `a` | `any` | `undefined` | The first object to compare. |
| `b` | `any` | `undefined` | The second object to compare. |
| `ignoreUndefined` | `boolean` | `false` | Optional. If set to true, undefined properties will be ignored during comparison. Default is false. |

## Returns

`boolean`

True if the objects are different, false otherwise.
