[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / Caller

# Type Alias: Caller\<T, U\>

```ts
type Caller<T, U> = (callee: Callee<T, U>) => () => void;
```

Defined in: packages/octagonal-wheels/src/conduit/transporter.ts:8

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

## Parameters

| Parameter | Type                                        |
| --------- | ------------------------------------------- |
| `callee`  | [`Callee`](../Callee/README.md)\<`T`, `U`\> |

## Returns

() => `void`
