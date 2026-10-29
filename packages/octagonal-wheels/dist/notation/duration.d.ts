/**
 * Formats a millisecond delta using compact seconds, minutes, hours, days, or years.
 *
 * @param deltaMs - The duration in milliseconds.
 * @returns The duration with two decimal places and a unit suffix. Unit
 * thresholds are 60 seconds, 60 minutes, 24 hours, and 365 days; values are
 * rounded for display without promoting to the next unit.
 * @remarks Negative and non-finite values follow JavaScript number comparison
 * and {@link Number.toFixed} behaviour, preserving the existing formatter's
 * results.
 */
export declare function formatDuration(deltaMs: number): string;
