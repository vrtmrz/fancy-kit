[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / RequeuePosition

# Variable: RequeuePosition

```ts
const RequeuePosition: {
  DANGER_KEEP_ORIGINAL: 0;
  LAST: 1;
};
```

Defined in: [src/BackedQueue/BackedQueueTypes.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L59)

Position for requeueing items.
Note: requeueing at the front can lead to starvation of other items.
Additionally, nextN is omitted in design.

## Type Declaration

### DANGER\_KEEP\_ORIGINAL

```ts
readonly DANGER_KEEP_ORIGINAL: 0 = 0;
```

Keep the original position in the logical ordering.
Items are kept ahead of later inserts. Use with great care as starvation risk exists.
Permanent queues are usually ordered FIFO, often by prefixed string comparison.
Preserving the original position is commonly achieved by preventing deletion rather than re-inserting at the front.
This may be dangerous. Use only when implications are fully understood.

### LAST

```ts
readonly LAST: 1 = 1;
```

Requeue at the back of the queue.
Items are processed after all items currently present.
Implemented by deleting the existing item and inserting it anew.
