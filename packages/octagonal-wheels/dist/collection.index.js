/**
 * Moves a selection index one step through a cyclic collection.
 *
 * @param currentIndex - The selected index, or `-1` when no item is selected.
 * @param count - The number of items. It must be a non-negative integer.
 * @param direction - Whether to move to the previous or next item.
 * @returns The next selection index. For a non-empty collection, `next` from
 * `-1` selects the first item and `prev` from `-1` selects the last item.
 * An empty collection returns `currentIndex` unchanged.
 * @remarks The last index wraps to zero when moving next, and zero wraps to
 * the last index when moving previous. A one-item collection remains at zero.
 */
function stepCyclicIndex(currentIndex, count, direction) {
    if (count === 0)
        return currentIndex;
    if (direction === "next")
        return (currentIndex + 1) % count;
    return currentIndex <= 0 ? count - 1 : currentIndex - 1;
}

export { stepCyclicIndex };
//# sourceMappingURL=collection.index.js.map
