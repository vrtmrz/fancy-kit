[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / Caller

# Type Alias: Caller()\<T, U\>

```ts
type Caller<T, U> = (callee: Callee<T, U>) => () => void;
```

Defined in: [src/conduit/transporter.ts:8](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporter.ts#L8)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `callee` | [`Callee`](../Callee/README.md)\<`T`, `U`\> |

## Returns

```ts
(): void;
```

### Returns

`void`
