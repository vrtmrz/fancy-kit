[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [map](../README.md) / withConcurrency

# Function: withConcurrency()

```ts
function withConcurrency<T, U>(
   iterable: Iterable<T, any, any> | AsyncIterable<T, any, any>, 
   callback: (t: T) => U | Promise<U>, 
concurrency: number): AsyncIterable<U>;
```

Defined in: [src/iterable/map.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/map.ts#L15)

apply a function to each element of an iterable asynchronously with a concurrency limit.
Note that the order of the elements is not guaranteed.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `iterable` | `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\> | An iterable items to be processed. |
| `callback` | (`t`: `T`) => `U` \| `Promise`\<`U`\> | A function to be applied to each element of the iterable. |
| `concurrency` | `number` | The number of concurrent processes. |

## Returns

`AsyncIterable`\<`U`\>
