import { wrapMemo } from "octagonal-wheels/function";
import { wrapMemo as aliasMemo } from "octagonal-wheels/function.js";
import { createCommandCheck } from "@vrtmrz/obsidian-plugin-kit/command";

const memo: (value: string) => void = wrapMemo((value: string) => { void value; });
const aliasedMemo: (value: boolean) => void = aliasMemo((value: boolean) => { void value; });
type Selected = { id: string };
const check: (checking: boolean) => boolean = createCommandCheck<Selected | null | undefined>(
  () => undefined,
  selected => { const item: Selected = selected; void item; },
);
// @ts-expect-error The wrapper retains its callback's argument type.
memo(1);
// @ts-expect-error Selection must accept the nullish unavailable result.
createCommandCheck<Selected | undefined>(() => 1, () => {});
void [memo, aliasedMemo, check];


import { createContentApplier, type ContentApplier, type ContentApplierAdapter } from "octagonal-wheels/content";
import { createContentApplier as aliasApplier } from "octagonal-wheels/content.js";
const adapter: ContentApplierAdapter<string, { value: number }, number, number> = {
  read: () => 0,
  onReadError: () => 0,
  decode: source => source.value,
  isSame: (old, next) => Promise.resolve(old === next),
  write: () => undefined,
};
const apply: ContentApplier<string, { value: number }> = createContentApplier(adapter);
const applyAlias = aliasApplier(adapter);
const result: Promise<"changed" | "unchanged"> = apply("key", { value: 1 });
// @ts-expect-error The source must retain the adapter's shape.
applyAlias("key", "value");
void result;
