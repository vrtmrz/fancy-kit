[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [map](../README.md) / filter

# Function: filter()

```ts
function filter<T>(iterable: Iterable<T, any, any> | AsyncIterable<T, any, any>, callback: (t: T) => boolean | Promise<boolean>): AsyncIterable<T>;
```

Defined in: [src/iterable/map.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/map.ts#L52)

Just like an filter function in the Array, but this function is asynchronous.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `iterable` | `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\> | Source iterable. |
| `callback` | (`t`: `T`) => `boolean` \| `Promise`\<`boolean`\> | Filtering function. |

## Returns

`AsyncIterable`\<`T`\>
