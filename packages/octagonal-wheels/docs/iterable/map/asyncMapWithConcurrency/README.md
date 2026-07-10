[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [map](../README.md) / asyncMapWithConcurrency

# Function: asyncMapWithConcurrency()

```ts
function asyncMapWithConcurrency<T, U>(
   iterable: Iterable<T, any, any> | AsyncIterable<T, any, any>, 
   callback: (t: T) => U | Promise<U>, 
concurrency: number): AsyncIterable<U>;
```

Defined in: [src/iterable/map.ts:78](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/map.ts#L78)

apply a function to each element of an iterable asynchronously, as keeping the order of the elements.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `iterable` | `Iterable`\<`T`, `any`, `any`\> \| `AsyncIterable`\<`T`, `any`, `any`\> | an iterable items to be processed. |
| `callback` | (`t`: `T`) => `U` \| `Promise`\<`U`\> | a function to be applied to each element of the iterable. |
| `concurrency` | `number` | the number of concurrent processes. |

## Returns

`AsyncIterable`\<`U`\>
