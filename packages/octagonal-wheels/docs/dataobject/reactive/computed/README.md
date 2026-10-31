[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / computed

# Function: computed()

```ts
function computed<T>(expression: ReactiveExpression<T>): () => T;
```

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:225

Creates a computed value based on a reactive expression.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Parameters

| Parameter    | Type                                                           | Description                         |
| ------------ | -------------------------------------------------------------- | ----------------------------------- |
| `expression` | [`ReactiveExpression`](../ReactiveExpression/README.md)\<`T`\> | The reactive expression to compute. |

## Returns

A function that returns the computed value.

() => `T`
