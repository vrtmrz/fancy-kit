[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / reactive

# Function: reactive()

```ts
function reactive<T>(
  expression: (prev?: T) => T,
  initialValue?: T,
): ReactiveValue<T>;
```

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:57

Creates a reactive value that tracks changes to a given expression.

## Type Parameters

| Type Parameter | Description                     |
| -------------- | ------------------------------- |
| `T`            | The type of the reactive value. |

## Parameters

| Parameter       | Type                  | Description                              |
| --------------- | --------------------- | ---------------------------------------- |
| `expression`    | (`prev?`: `T`) => `T` | The expression to track changes for.     |
| `initialValue?` | `T`                   | The initial value of the reactive value. |

## Returns

[`ReactiveValue`](../ReactiveValue/README.md)\<`T`\>

- The reactive value.
