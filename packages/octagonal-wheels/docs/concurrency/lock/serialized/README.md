[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [lock](../README.md) / serialized

# Function: serialized()

```ts
function serialized<T>(key: string | symbol, proc: Task<T>): Promise<T>;
```

Defined in: [src/concurrency/lock\_v2.ts:38](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/lock_v2.ts#L38)

Run tasks one by one in their group.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | `string` \| `symbol` | key of the group |
| `proc` | [`Task`](../Task/README.md)\<`T`\> | process to run |

## Returns

`Promise`\<`T`\>

result of the process
