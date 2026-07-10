[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [task](../README.md) / wrapFunctionAsShared

# Function: wrapFunctionAsShared()

```ts
function wrapFunctionAsShared<P, T>(proc: (...p: P) => Promise<T>): (...p: P) => Promise<T>;
```

Defined in: [src/concurrency/task.ts:222](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/task.ts#L222)

## Type Parameters

| Type Parameter |
| ------ |
| `P` *extends* `any`[] |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `proc` | (...`p`: `P`) => `Promise`\<`T`\> |

## Returns

```ts
(...p: P): Promise<T>;
```

### Parameters

| Parameter | Type |
| ------ | ------ |
| ...`p` | `P` |

### Returns

`Promise`\<`T`\>
