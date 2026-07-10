[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [promises](../README.md) / ExtendableDelay

# Type Alias: ExtendableDelay\<T, U\>

```ts
type ExtendableDelay<T, U> = {
  cancel: (reason: T | U) => void;
  promise: Promise<T | U>;
  extend: void;
};
```

Defined in: [src/promises.ts:193](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L193)

An extendable delay that can be cancelled or extended.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` *extends* `string` \| `symbol` \| `number` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="cancel"></a> `cancel` | (`reason`: `T` \| `U`) => `void` | [src/promises.ts:195](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L195) |
| <a id="promise"></a> `promise` | `Promise`\<`T` \| `U`\> | [src/promises.ts:194](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L194) |

## Methods

### extend()

```ts
extend(newTimeout: number): void;
```

Defined in: [src/promises.ts:196](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/promises.ts#L196)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `newTimeout` | `number` |

#### Returns

`void`
