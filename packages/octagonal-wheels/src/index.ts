/* istanbul ignore file -- @preserve */
declare const LIB_VERSION: string | undefined;
/**
 * Returns the version of the library.
 * If the version is not available, it returns "dev".
 *
 * @returns The version of the library.
 */
export function libVersion(): string {
    return LIB_VERSION || "dev";
}

export * as binary from "./binary/index.ts";
export * as common from "./common/index.ts";
export * as concurrency from "./concurrency/index.ts";
export * as dataobject from "./dataobject/index.ts";
export * as databases from "./databases/index.ts";
export * as hash from "./hash/index.ts";
export * as memory from "./memory/index.ts";
export * as messagepassing from "./messagepassing/index.ts";
export * as collection from "./collection.ts";
export * as function from "./function.ts";
export * as object from "./object.ts";
export * as promises from "./promises.ts";
export * as string from "./string.ts";
export * as number from "./number.ts";
export * as encryption from "./encryption/index.ts";
export * as context from "./context.ts";
export * as actor from "./actor.ts";
export * as events from "./events.ts";
export * as iterable from "./iterable/index.ts";
export * as bureau from "./bureau/index.ts";
export * as conduit from "./conduit/index.ts";
export * as channel from "./channel/index.ts";
export * as BackedQueue from "./BackedQueue/index.ts";
