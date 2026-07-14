import { describe, expect, it } from "vitest";
import {
  describeOptionalVisibilityEvidence,
  formatHarnessMarkdownReport,
} from "./report.js";

describe("describeOptionalVisibilityEvidence", () => {
  it.each([
    [false, false, "Not observed (informational)"],
    [true, false, "Hidden observed; return not observed"],
    [true, true, "Hidden and return observed"],
    [false, true, "Return observed without hidden event"],
  ])(
    "describes hidden=%s and returned=%s without treating absence as failure",
    (hiddenObserved, returnedObserved, expected) => {
      expect(
        describeOptionalVisibilityEvidence(hiddenObserved, returnedObserved),
      ).toBe(expected);
    },
  );
});

describe("formatHarnessMarkdownReport", () => {
  it("formats device information and scenario outcomes for a pull request", () => {
    const report = formatHarnessMarkdownReport({
      generatedAt: "2026-07-14T13:00:00.000Z",
      environment: [
        { label: "Harness version", value: "0.1.1" },
        { label: "User agent", value: "Obsidian Mobile | Android\nChromium" },
      ],
      scenarios: [
        {
          id: "wake-lock-guided",
          title: "Mobile wake-lock review",
          mode: "guided",
          status: "passed",
          detail: "Display stayed awake, then switched off after release.",
        },
      ],
      guidedReview: [
        { label: "Wake-lock display", value: "passed" },
        { label: "Post-release display", value: "passed" },
      ],
      currentState: [
        { label: "Platform sentinel held", value: "false" },
        { label: "Logical leases", value: "0" },
      ],
      transcript: [
        {
          at: "2026-07-14T13:00:01.000Z",
          event: "post-release-display-confirmed",
          detail: { result: "yes" },
        },
      ],
    });

    expect(report).toContain("## Fancy Kit Harness report");
    expect(report).toContain(
      "| User agent | Obsidian Mobile \\| Android<br>Chromium |",
    );
    expect(report).toContain(
      "| Mobile wake-lock review (wake-lock-guided) | guided | passed |",
    );
    expect(report).toContain("| Post-release display | passed |");
    expect(report).toContain('"event": "post-release-display-confirmed"');
    expect(report).toContain("was not transmitted by Fancy Kit");
    expect(report).toContain("excludes Vault names");
  });

  it("renders an empty transcript as valid JSON", () => {
    const report = formatHarnessMarkdownReport({
      generatedAt: "2026-07-14T13:00:00.000Z",
      environment: [],
      scenarios: [],
      guidedReview: [],
      currentState: [],
      transcript: [],
    });

    expect(report).toContain("```json\n[]\n```");
  });
});
