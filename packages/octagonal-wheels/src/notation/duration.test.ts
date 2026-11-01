import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration.ts";

describe("formatDuration", () => {
    it.each<[number, string]>([
        [0, "0.00s"],
        [1_234, "1.23s"],
        [59_999, "60.00s"],
        [60_000, "1.00m"],
        [3_599_999, "60.00m"],
        [3_600_000, "1.00h"],
        [86_399_999, "24.00h"],
        [86_400_000, "1.00d"],
        [365 * 24 * 60 * 60 * 1000 - 1, "365.00d"],
        [365 * 24 * 60 * 60 * 1000, "1.00y"],
    ])("formats %s milliseconds as %s", (deltaMs, expected) => {
        expect(formatDuration(deltaMs)).toBe(expected);
    });

    it("preserves negative and non-finite number behaviour", () => {
        expect(formatDuration(-1_234)).toBe("-1.23s");
        expect(formatDuration(-60_000)).toBe("-60.00s");
        expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("∞y");
        expect(formatDuration(Number.NEGATIVE_INFINITY)).toBe("-Infinitys");
        expect(formatDuration(Number.NaN)).toBe("NaNy");
    });
});
