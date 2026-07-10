[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [object](../README.md) / extractObject

# Function: extractObject()

```ts
function extractObject<T>(template: Partial<T>, obj: T): Partial<T>;
```

Defined in: [src/object.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/object.ts#L10)

Extracts properties from an object based on a template object.
Only properties present in the template object will be included in the result.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the template object. |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `template` | `Partial`\<`T`\> | The template object containing the properties to extract. |
| `obj` | `T` | The object from which to extract properties. |

## Returns

`Partial`\<`T`\>

- A new object containing the extracted properties.
