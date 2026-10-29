import { formatDuration } from "octagonal-wheels/notation/duration";
import { formatDuration as categoryDuration } from "octagonal-wheels/notation";
import { cloneViaJSON } from "octagonal-wheels/encoding/json";
import { cloneViaJSON as categoryClone } from "octagonal-wheels/encoding";
import { findPathComponentsExceedingUtf8Limit } from "octagonal-wheels/path";
import { splitDelimitedList, joinDelimitedList } from "octagonal-wheels/string";
import { stepCyclicIndex } from "octagonal-wheels/collection";

const text: string = formatDuration(60_000);
const categoryText: string = categoryDuration(60_000);
const cloned: unknown = cloneViaJSON({ x: 1 });
const categoryCloned: unknown = categoryClone({ x: 1 });
const oversized: { component: string; utf8Bytes: number }[] = findPathComponentsExceedingUtf8Limit("folder/file", 255);
const items: string[] = splitDelimitedList("a|b", "|");
const joined: string = joinDelimitedList(items, "|");
const index: number = stepCyclicIndex(-1, 3, "prev");
void [text, categoryText, cloned, categoryCloned, oversized, joined, index];

// @ts-expect-error JSON conversion does not preserve the input's type.
const originalType: { x: number } = cloneViaJSON({ x: 1 });
// @ts-expect-error The direction is explicit.
stepCyclicIndex(0, 3, "forward");
void originalType;
