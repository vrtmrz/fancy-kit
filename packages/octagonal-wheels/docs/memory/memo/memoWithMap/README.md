[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [memory](../../README.md) / [memo](../README.md) / memoWithMap

# Function: memoWithMap()

```ts
function memoWithMap<T, TResult>(
   bufferLength: number, 
   fn: (...args: T) => Promise<TResult>, 
keyFunction?: (args: T) => string): (...args: T) => Promise<TResult>;
```

Defined in: [src/memory/memo.ts:5](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/memory/memo.ts#L5)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `TResult` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `bufferLength` | `number` |
| `fn` | (...`args`: `T`) => `Promise`\<`TResult`\> |
| `keyFunction?` | (`args`: `T`) => `string` |

## Returns

```ts
(...args: T): Promise<TResult>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `T` |

### Returns

`Promise`\<`TResult`\>
