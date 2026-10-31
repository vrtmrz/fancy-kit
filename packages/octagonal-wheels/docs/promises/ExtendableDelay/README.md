[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / ExtendableDelay

# Type Alias: ExtendableDelay\<T, U\>

```ts
type ExtendableDelay<T, U> = {
  cancel: (reason: T | U) => void;
  promise: Promise<T | U>;
  extend: void;
};
```

Defined in: packages/octagonal-wheels/src/promises.ts:193

An extendable delay that can be cancelled or extended.

## Type Parameters

| Type Parameter                                 |
| ---------------------------------------------- |
| `T`                                            |
| `U` _extends_ `string` \| `symbol` \| `number` |

## Properties

| Property                       | Type                             | Defined in                                    |
| ------------------------------ | -------------------------------- | --------------------------------------------- |
| <a id="cancel"></a> `cancel`   | (`reason`: `T` \| `U`) => `void` | packages/octagonal-wheels/src/promises.ts:195 |
| <a id="promise"></a> `promise` | `Promise`\<`T` \| `U`\>          | packages/octagonal-wheels/src/promises.ts:194 |

## Methods

### extend()

```ts
extend(newTimeout: number): void;
```

Defined in: packages/octagonal-wheels/src/promises.ts:196

#### Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `newTimeout` | `number` |

#### Returns

`void`
