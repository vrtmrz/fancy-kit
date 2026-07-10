[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / onlyLatest

# Function: onlyLatest()

```ts
function onlyLatest<T>(key: string | symbol, proc: Task<T>): Promise<typeof SYMBOL_SKIPPED | T>;
```

Defined in: [src/concurrency/lock\_v2.ts:69](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L69)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` \| `symbol` |
| `proc` | [`Task`](../Task/README.md)\<`T`\> |

## Returns

`Promise`\<*typeof* [`SYMBOL_SKIPPED`](../SYMBOL_SKIPPED/README.md) \| `T`\>
