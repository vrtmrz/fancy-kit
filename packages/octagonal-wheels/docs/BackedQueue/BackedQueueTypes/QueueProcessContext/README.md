[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueueProcessContext

# Interface: QueueProcessContext

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:92

## Methods

### commit()

```ts
commit(keys: string): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:93

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `keys`    | `string` |

#### Returns

`Promise`\<`void`\>

---

### requeue()

```ts
requeue(keys: string, position?: RequestPositions): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:94

#### Parameters

| Parameter   | Type                                                |
| ----------- | --------------------------------------------------- |
| `keys`      | `string`                                            |
| `position?` | [`RequestPositions`](../RequestPositions/README.md) |

#### Returns

`Promise`\<`void`\>

---

### revoke()

```ts
revoke(keys: string): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:95

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `keys`    | `string` |

#### Returns

`Promise`\<`void`\>
