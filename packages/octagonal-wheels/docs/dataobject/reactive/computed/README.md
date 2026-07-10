[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / computed

# Function: computed()

```ts
function computed<T>(expression: ReactiveExpression<T>): () => T;
```

Defined in: [src/dataobject/reactive\_v2.ts:225](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L225)

Creates a computed value based on a reactive expression.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `expression` | [`ReactiveExpression`](../ReactiveExpression/README.md)\<`T`\> | The reactive expression to compute. |

## Returns

A function that returns the computed value.

```ts
(): T;
```

### Returns

`T`
