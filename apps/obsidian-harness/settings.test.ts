import { describe, expect, it } from "vitest";
import {
  parseHarnessSettings,
  serialiseHarnessSettings,
} from "./settings.js";

describe("harness settings", () => {
  it("defaults to an unselected mode", () => {
    expect(parseHarnessSettings(undefined)).toEqual({
      settings: { schemaVersion: 1, mode: null },
    });
  });

  it("normalises a valid one-shot automation request", () => {
    expect(
      parseHarnessSettings({
        schemaVersion: 1,
        mode: "automation",
        pendingRun: {
          requestId: " run-1 ",
          scenarios: ["vault-text", "wake-lock-nested", "vault-text"],
        },
      }),
    ).toEqual({
      settings: {
        schemaVersion: 1,
        mode: "automation",
        pendingRun: {
          requestId: "run-1",
          scenarios: ["vault-text", "wake-lock-nested"],
        },
      },
    });
  });

  it("keeps an invalid request available for a later corrected write", () => {
    const invalid = { requestId: "run-2", scenarios: ["unknown"] };
    const parsed = parseHarnessSettings({
      schemaVersion: 1,
      mode: "automation",
      pendingRun: invalid,
    });
    expect(parsed.settings.pendingRun).toBeUndefined();
    expect(parsed.pendingRunError).toBe("Unknown harness scenario: unknown");
    expect(
      serialiseHarnessSettings(parsed.settings, parsed.invalidPendingRun),
    ).toEqual({
      schemaVersion: 1,
      mode: "automation",
      pendingRun: invalid,
    });
  });

  it("does not consume a request from an unsupported settings schema", () => {
    const pendingRun = { requestId: "run-3", scenarios: ["vault-text"] };
    const parsed = parseHarnessSettings({
      schemaVersion: 2,
      mode: "automation",
      pendingRun,
    });
    expect(parsed.settings.pendingRun).toBeUndefined();
    expect(parsed.pendingRunError).toBe(
      "Unsupported harness settings schema: 2",
    );
    expect(
      serialiseHarnessSettings(parsed.settings, parsed.invalidPendingRun),
    ).toEqual({
      schemaVersion: 1,
      mode: "automation",
      pendingRun,
    });
  });

  it("omits a consumed request from serialised settings", () => {
    expect(
      serialiseHarnessSettings({ schemaVersion: 1, mode: "automation" }),
    ).toEqual({ schemaVersion: 1, mode: "automation" });
  });
});
