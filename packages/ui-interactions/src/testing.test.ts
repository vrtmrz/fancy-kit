import { describe, expect, expectTypeOf, it } from "vitest";
import type { ScriptedUiStep } from "./testing.js";
import { createUiTestHarness } from "./testing.js";

function unsafeStep(step: unknown): ScriptedUiStep {
  return step as ScriptedUiStep;
}

describe("createUiTestHarness", () => {
  it("drives a typed application flow without an App or DOM", async () => {
    const first = { id: 1, name: "First" };
    const second = { id: 2, name: "Second" };
    const harness = createUiTestHarness([
      { kind: "promptText", interactionId: "device", value: "laptop" },
      { kind: "promptPassword", value: "secret" },
      { kind: "pickOne", value: second },
      { kind: "confirmAction", value: "apply" },
      { kind: "showMessage" },
    ]);

    await expect(harness.ui.promptText({ title: "Device" }, "device")).resolves.toBe("laptop");
    await expect(harness.ui.promptPassword({ title: "Password" })).resolves.toBe("secret");
    await expect(
      harness.ui.pickOne({ items: [first, second], getText: (item) => item.name }),
    ).resolves.toBe(second);
    const action = harness.ui.confirmAction({
      title: "Confirm",
      message: "Apply?",
      actions: ["apply", "cancel"] as const,
    });
    expectTypeOf(action).toEqualTypeOf<Promise<"apply" | "cancel" | null>>();
    await expect(action).resolves.toBe("apply");
    await expect(harness.ui.showMessage({ title: "Done", message: "Finished" })).resolves.toBeUndefined();

    harness.assertDone();
    expect(harness.transcript.map(({ kind }) => kind)).toEqual([
      "promptText",
      "promptPassword",
      "pickOne",
      "confirmAction",
      "showMessage",
    ]);
  });

  it("supports request spies and detects unconsumed expectations", async () => {
    const harness = createUiTestHarness([
      {
        kind: "promptText",
        interactionId: "name",
        value: (request) => {
          expectTypeOf(request.kind).toEqualTypeOf<"promptText">();
          expect(request.options.title).toBe("Device");
          return "observed";
        },
      },
      { kind: "showMessage", interactionId: "unused" },
    ]);

    await expect(harness.ui.promptText({ title: "Device" }, "name")).resolves.toBe("observed");
    expect(() => harness.assertDone()).toThrow("unused");
  });

  it("rejects automated values that real UI could not return", async () => {
    const item = { id: 1 };
    const invalidItem = createUiTestHarness([unsafeStep({ kind: "pickOne", value: { id: 1 } })]);
    await expect(
      invalidItem.ui.pickOne({ items: [item], getText: ({ id }) => String(id) }),
    ).rejects.toThrow("one of the supplied items");

    const invalidAction = createUiTestHarness([
      unsafeStep({ kind: "confirmAction", value: "unknown" }),
    ]);
    await expect(
      invalidAction.ui.confirmAction({
        title: "Confirm",
        message: "Proceed?",
        actions: ["yes", "no"] as const,
      }),
    ).rejects.toThrow("one of the supplied actions");

    const invalidText = createUiTestHarness([unsafeStep({ kind: "promptText", value: undefined })]);
    await expect(invalidText.ui.promptText({ title: "Name" })).rejects.toThrow("string or null");

    const invalidMessage = createUiTestHarness([
      unsafeStep({ kind: "showMessage", value: "acknowledged" }),
    ]);
    await expect(
      invalidMessage.ui.showMessage({ title: "Done", message: "Finished" }),
    ).rejects.toThrow("no response value");
  });

  it("fails clearly when a script passes through without a platform adapter", async () => {
    const harness = createUiTestHarness([{ kind: "promptText", passthrough: true }]);
    await expect(harness.ui.promptText({ title: "Name" })).rejects.toThrow("No UI fallback");
  });
});
