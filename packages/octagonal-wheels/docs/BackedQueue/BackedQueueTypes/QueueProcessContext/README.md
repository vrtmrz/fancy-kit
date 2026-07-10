[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueueProcessContext

# Interface: QueueProcessContext

Defined in: [src/BackedQueue/BackedQueueTypes.ts:92](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L92)

## Methods

### commit()

```ts
commit(keys: string): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueueTypes.ts:93](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L93)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keys` | `string` |

#### Returns

`Promise`\<`void`\>

***

### requeue()

```ts
requeue(keys: string, position?: RequestPositions): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueueTypes.ts:94](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L94)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keys` | `string` |
| `position?` | [`RequestPositions`](../RequestPositions/README.md) |

#### Returns

`Promise`\<`void`\>

***

### revoke()

```ts
revoke(keys: string): Promise<void>;
```

Defined in: [src/BackedQueue/BackedQueueTypes.ts:95](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L95)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `keys` | `string` |

#### Returns

`Promise`\<`void`\>
