[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / ReactiveSource

# Type Alias: ReactiveSource\<T\>

```ts
type ReactiveSource<T> = {
  offChanged: (handler: ReactiveChangeHandler<T>) => void;
  onChanged: (handler: ReactiveChangeHandler<T>) => void;
  value: T;
};
```

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:17

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                             | Type                                                                                        | Defined in                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| <a id="offchanged"></a> `offChanged` | (`handler`: [`ReactiveChangeHandler`](../ReactiveChangeHandler/README.md)\<`T`\>) => `void` | packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:20 |
| <a id="onchanged"></a> `onChanged`   | (`handler`: [`ReactiveChangeHandler`](../ReactiveChangeHandler/README.md)\<`T`\>) => `void` | packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:19 |
| <a id="value"></a> `value`           | `T`                                                                                         | packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:18 |
