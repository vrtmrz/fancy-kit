[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / reactiveSource

# Function: reactiveSource()

```ts
function reactiveSource<T>(initialValue: T): ReactiveSource<T>;
```

Defined in: [src/dataobject/reactive\_v2.ts:46](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L46)

Creates a reactive instance with the given initial value.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the reactive instance. |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `initialValue` | `T` | The initial value of the reactive instance. |

## Returns

[`ReactiveSource`](../ReactiveSource/README.md)\<`T`\>

A reactive instance with the given initial value.
