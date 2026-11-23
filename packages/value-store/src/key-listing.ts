import type { ValueKeyListOptions } from "./contracts.js";
import { sanitiseValueStoreError, ValueStoreError } from "./errors.js";
import { validateValueKey, validateValuePrefix } from "./validation.js";

/** Validated, detached options passed from a facade to its raw backend. */
export interface PreparedValueKeyListOptions {
  /** Validated literal logical prefix, defaulting to the empty string. */
  prefix: string;
  /** Validated inclusive or exclusive lower logical bound. */
  lower?: string;
  /** Whether the lower bound is exclusive. */
  lowerExclusive: boolean;
  /** Validated inclusive or exclusive upper logical bound. */
  upper?: string;
  /** Whether the upper bound is exclusive. */
  upperExclusive: boolean;
  /** Validated non-negative safe integer result cap. */
  limit?: number;
}

/** Validates and snapshots own data fields without invoking caller accessors. */
export function snapshotKeyListOptions(options?: ValueKeyListOptions): PreparedValueKeyListOptions {
  if (options === undefined) return preparedOptions("", undefined, false, undefined, false, undefined);
  try {
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new ValueStoreError("invalid-value");
    }
    const prefix = field(options, "prefix");
    const lower = field(options, "lower");
    const lowerExclusive = field(options, "lowerExclusive");
    const upper = field(options, "upper");
    const upperExclusive = field(options, "upperExclusive");
    const limit = field(options, "limit");

    if (prefix !== undefined) validateValuePrefix(prefix);
    if (lower !== undefined) validateValueKey(lower);
    if (upper !== undefined) validateValueKey(upper);
    if (lowerExclusive !== undefined && typeof lowerExclusive !== "boolean") throw new ValueStoreError("invalid-value");
    if (upperExclusive !== undefined && typeof upperExclusive !== "boolean") throw new ValueStoreError("invalid-value");
    const preparedLowerExclusive = lowerExclusive ?? false;
    const preparedUpperExclusive = upperExclusive ?? false;
    if (preparedLowerExclusive && lower === undefined) throw new ValueStoreError("invalid-value");
    if (preparedUpperExclusive && upper === undefined) throw new ValueStoreError("invalid-value");
    if (limit !== undefined && (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 0)) {
      throw new ValueStoreError("invalid-value");
    }
    return preparedOptions(
      prefix === undefined ? "" : prefix as string,
      lower as string | undefined,
      preparedLowerExclusive,
      upper as string | undefined,
      preparedUpperExclusive,
      limit as number | undefined,
    );
  } catch (error) {
    throw sanitiseValueStoreError(error);
  }
}

function preparedOptions(
  prefix: string,
  lower: string | undefined,
  lowerExclusive: boolean,
  upper: string | undefined,
  upperExclusive: boolean,
  limit: number | undefined,
): PreparedValueKeyListOptions {
  return Object.assign(Object.create(null) as PreparedValueKeyListOptions, {
    prefix,
    lower,
    lowerExclusive,
    upper,
    upperExclusive,
    limit,
  });
}

function field(target: object, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  if (descriptor === undefined) return undefined;
  if (!Object.hasOwn(descriptor, "value")) throw new ValueStoreError("invalid-value");
  return descriptor.value;
}

/** Compares strings by JavaScript's ascending UTF-16 code-unit ordering. */
export function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Returns the smallest UTF-16 string above every string with this prefix. */
export function nextUtf16Prefix(prefix: string): string | undefined {
  for (let index = prefix.length - 1; index >= 0; index -= 1) {
    const unit = prefix.charCodeAt(index);
    if (unit < 0xffff) return prefix.slice(0, index) + String.fromCharCode(unit + 1);
  }
  return undefined;
}

/** Inclusive or exclusive physical string bounds for a captured logical scope. */
export interface PhysicalKeyBounds {
  /** Inclusive or exclusive lower physical key bound. */
  lower?: string;
  /** Whether the lower physical key bound is exclusive. */
  lowerExclusive: boolean;
  /** Inclusive or exclusive upper physical key bound. */
  upper?: string;
  /** Whether the upper physical key bound is exclusive. */
  upperExclusive: boolean;
}

/** Intersects the physical prefix range with optional logical lower and upper bounds. */
export function computePhysicalKeyBounds(
  storePrefix: string,
  options: PreparedValueKeyListOptions,
): PhysicalKeyBounds | null {
  const physicalPrefix = storePrefix + options.prefix;
  let lower: string | undefined;
  let lowerExclusive = false;
  let upper: string | undefined;
  let upperExclusive = false;

  if (physicalPrefix.length > 0) {
    lower = physicalPrefix;
    const next = nextUtf16Prefix(physicalPrefix);
    if (next !== undefined) {
      upper = next;
      upperExclusive = true;
    }
  }
  if (options.lower !== undefined) {
    const candidate = storePrefix + options.lower;
    const comparison = lower === undefined ? 1 : compareUtf16(candidate, lower);
    if (lower === undefined || comparison > 0) {
      lower = candidate;
      lowerExclusive = options.lowerExclusive;
    } else if (comparison === 0) {
      lowerExclusive ||= options.lowerExclusive;
    }
  }
  if (options.upper !== undefined) {
    const candidate = storePrefix + options.upper;
    const comparison = upper === undefined ? -1 : compareUtf16(candidate, upper);
    if (upper === undefined || comparison < 0) {
      upper = candidate;
      upperExclusive = options.upperExclusive;
    } else if (comparison === 0) {
      upperExclusive ||= options.upperExclusive;
    }
  }
  if (lower !== undefined && upper !== undefined) {
    const comparison = compareUtf16(lower, upper);
    if (comparison > 0 || (comparison === 0 && (lowerExclusive || upperExclusive))) return null;
  }
  return Object.assign(Object.create(null) as PhysicalKeyBounds, {
    lower,
    lowerExclusive,
    upper,
    upperExclusive,
  });
}

/** Filters physical keys to a captured scope, returning sorted logical keys. */
export function listKeysFromIterable(
  physicalKeys: Iterable<string>,
  storePrefix: string,
  options: PreparedValueKeyListOptions,
): string[] {
  const bounds = computePhysicalKeyBounds(storePrefix, options);
  if (options.limit === 0 || bounds === null) return [];
  const keys: string[] = [];
  for (const key of physicalKeys) {
    if (!key.startsWith(storePrefix)) continue;
    if (bounds.lower !== undefined && (compareUtf16(key, bounds.lower) < 0 || (bounds.lowerExclusive && key === bounds.lower))) continue;
    if (bounds.upper !== undefined && (compareUtf16(key, bounds.upper) > 0 || (bounds.upperExclusive && key === bounds.upper))) continue;
    keys.push(key.slice(storePrefix.length));
  }
  keys.sort(compareUtf16);
  return options.limit === undefined ? keys : keys.slice(0, options.limit);
}
