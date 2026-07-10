[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / ReactiveSource

# Type Alias: ReactiveSource\<T\>

```ts
type ReactiveSource<T> = {
  offChanged: (handler: ReactiveChangeHandler<T>) => void;
  onChanged: (handler: ReactiveChangeHandler<T>) => void;
  value: T;
};
```

Defined in: [src/dataobject/reactive\_v2.ts:17](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L17)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="offchanged"></a> `offChanged` | (`handler`: [`ReactiveChangeHandler`](../ReactiveChangeHandler/README.md)\<`T`\>) => `void` | [src/dataobject/reactive\_v2.ts:20](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L20) |
| <a id="onchanged"></a> `onChanged` | (`handler`: [`ReactiveChangeHandler`](../ReactiveChangeHandler/README.md)\<`T`\>) => `void` | [src/dataobject/reactive\_v2.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L19) |
| <a id="value"></a> `value` | `T` | [src/dataobject/reactive\_v2.ts:18](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L18) |
