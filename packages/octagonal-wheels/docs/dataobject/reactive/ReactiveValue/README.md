[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / ReactiveValue

# Type Alias: ReactiveValue\<T\>

```ts
type ReactiveValue<T> = {
  offChanged: (handler: ReactiveChangeHandler<T>) => void;
  onChanged: (handler: ReactiveChangeHandler<T>) => void;
  value: T;
};
```

Defined in: [src/dataobject/reactive\_v2.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L12)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="offchanged"></a> `offChanged` | `public` | (`handler`: [`ReactiveChangeHandler`](../ReactiveChangeHandler/README.md)\<`T`\>) => `void` | [src/dataobject/reactive\_v2.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L15) |
| <a id="onchanged"></a> `onChanged` | `public` | (`handler`: [`ReactiveChangeHandler`](../ReactiveChangeHandler/README.md)\<`T`\>) => `void` | [src/dataobject/reactive\_v2.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L14) |
| <a id="value"></a> `value` | `readonly` | `T` | [src/dataobject/reactive\_v2.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L13) |
