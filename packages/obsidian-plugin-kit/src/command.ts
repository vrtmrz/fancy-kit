/**
 * Creates an Obsidian command check callback which selects its value afresh
 * whenever Obsidian invokes it.
 *
 * A falsey selected value, including `false`, `0`, `''`, `null`, `undefined`,
 * and `NaN`, marks the command as unavailable and returns `false`. A truthy
 * selected value returns `true`. When `checking` is `true`, the action is not
 * run; otherwise, the exact value selected for that invocation is passed to
 * the action.
 *
 * The action uses the command callback's synchronous `void` contract.
 * Synchronous exceptions propagate to the caller. If the action returns a
 * Promise, this helper does not await it or handle its rejection; the action
 * owner is responsible for asynchronous failures.
 *
 * @param select - Selects the current value used to determine availability.
 * @param execute - Handles the selected, non-nullish value for execution calls.
 * @returns A command check callback which reports availability or executes the action.
 */
export function createCommandCheck<T>(
  select: () => T,
  execute: (selected: NonNullable<T>) => void,
): (checking: boolean) => boolean {
  return (checking) => {
    const selected = select();
    if (!selected) return false;
    if (!checking) execute(selected);
    return true;
  };
}
