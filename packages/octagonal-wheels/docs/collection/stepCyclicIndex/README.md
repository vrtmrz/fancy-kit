[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [collection](../README.md) / stepCyclicIndex

# Function: stepCyclicIndex()

```ts
function stepCyclicIndex(
  currentIndex: number,
  count: number,
  direction: "prev" | "next",
): number;
```

Defined in: packages/octagonal-wheels/src/collection.index.ts:13

Moves a selection index one step through a cyclic collection.

## Parameters

| Parameter      | Type                 | Description                                             |
| -------------- | -------------------- | ------------------------------------------------------- |
| `currentIndex` | `number`             | The selected index, or `-1` when no item is selected.   |
| `count`        | `number`             | The number of items. It must be a non-negative integer. |
| `direction`    | `"prev"` \| `"next"` | Whether to move to the previous or next item.           |

## Returns

`number`

The next selection index. For a non-empty collection, `next` from
`-1` selects the first item and `prev` from `-1` selects the last item.
An empty collection returns `currentIndex` unchanged.

## Remarks

The last index wraps to zero when moving next, and zero wraps to
the last index when moving previous. A one-item collection remains at zero.
