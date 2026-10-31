/**
 * Formats a millisecond delta using compact seconds, minutes, hours, days, or years.
 *
 * @param deltaMs - The duration in milliseconds.
 * @returns The duration with two decimal places and a unit suffix. Unit
 * thresholds are 60 seconds, 60 minutes, 24 hours, and 365 days; values are
 * rounded for display without promoting to the next unit.
 * @remarks Positive infinity is displayed as `∞y`. Other negative and non-finite
 * values follow JavaScript number comparison and Number.toFixed behaviour,
 * preserving their existing results.
 */
export function formatDuration(deltaMs: number): string {
    if (deltaMs === Number.POSITIVE_INFINITY) return "∞y";
    const sec = deltaMs / 1000;
    if (sec < 60) {
        return `${sec.toFixed(2)}s`;
    }
    const min = sec / 60;
    if (min < 60) {
        return `${min.toFixed(2)}m`;
    }
    const hour = min / 60;
    if (hour < 24) {
        return `${hour.toFixed(2)}h`;
    }
    const day = hour / 24;
    if (day < 365) {
        return `${day.toFixed(2)}d`;
    }
    const year = day / 365;
    return `${year.toFixed(2)}y`;
}
