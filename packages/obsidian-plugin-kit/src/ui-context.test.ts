import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { App } from "obsidian";

const dialogMock = vi.hoisted(() => ({
  promptText: vi.fn(),
  promptPassword: vi.fn(),
  pickOne: vi.fn(),
  confirmAction: vi.fn(),
  showMessage: vi.fn(),
}));

vi.mock("./dialog.js", () => dialogMock);

import { createScriptedUiDriver } from "./testing.js";
import { createObsidianUi, createUiContext } from "./ui-context.js";

const app = {} as App;

afterEach(() => {
  vi.clearAllMocks();
});

describe("UiContext automation", () => {
  it("exposes the neutral contract through the explicit Obsidian factory", () => {
    const ui = createObsidianUi(app);
    expectTypeOf(ui).toMatchTypeOf<{
      promptText(options: { title: string }, interactionId?: string): Promise<string | null>;
    }>();
  });

  it("consumes typed scripted responses and records a transcript", async () => {
    const first = { id: 1, name: "First" };
    const second = { id: 2, name: "Second" };
    const driver = createScriptedUiDriver([
      { kind: "promptText", interactionId: "device", value: "laptop" },
      { kind: "promptPassword", value: "secret" },
      { kind: "pickOne", value: second },
      { kind: "confirmAction", value: "apply" },
      { kind: "showMessage" },
    ]);
    const ui = createUiContext(app, { driver });

    await expect(ui.promptText({ title: "Device" }, "device")).resolves.toBe("laptop");
    await expect(ui.promptPassword({ title: "Password" })).resolves.toBe("secret");
    await expect(ui.pickOne({ items: [first, second], getText: (item) => item.name })).resolves.toBe(second);
    const action = ui.confirmAction({
      title: "Confirm",
      message: "Apply?",
      actions: ["apply", "cancel"] as const,
    });
    expectTypeOf(action).toEqualTypeOf<Promise<"apply" | "cancel" | null>>();
    await expect(action).resolves.toBe("apply");
    await expect(ui.showMessage({ title: "Done", message: "Finished" })).resolves.toBeUndefined();

    driver.assertDone();
    expect(driver.transcript.map(({ kind }) => kind)).toEqual([
      "promptText",
      "promptPassword",
      "pickOne",
      "confirmAction",
      "showMessage",
    ]);
    expect(dialogMock.promptText).not.toHaveBeenCalled();
  });

  it("supports a response function that spies on request details", async () => {
    const driver = createScriptedUiDriver([
      {
        kind: "promptText",
        value: (request) => {
          expect(request.options.title).toBe("Device");
          return "observed";
        },
      },
    ]);

    await expect(createUiContext(app, { driver }).promptText({ title: "Device" })).resolves.toBe("observed");
    driver.assertDone();
  });

  it("validates automated selections and actions", async () => {
    const item = { id: 1 };
    const invalidItemDriver = createScriptedUiDriver([{ kind: "pickOne", value: { id: 1 } }]);
    await expect(
      createUiContext(app, { driver: invalidItemDriver }).pickOne({
        items: [item],
        getText: ({ id }) => String(id),
      }),
    ).rejects.toThrow("one of the supplied items");

    const invalidActionDriver = createScriptedUiDriver([{ kind: "confirmAction", value: "unknown" }]);
    await expect(
      createUiContext(app, { driver: invalidActionDriver }).confirmAction({
        title: "Confirm",
        message: "Proceed?",
        actions: ["yes", "no"] as const,
      }),
    ).rejects.toThrow("one of the supplied actions");
  });

  it("fails on an unexpected interaction or id", async () => {
    const wrongKind = createScriptedUiDriver([{ kind: "confirmAction", value: "yes" }]);
    await expect(createUiContext(app, { driver: wrongKind }).promptText({ title: "Name" })).rejects.toThrow(
      "Expected UI interaction confirmAction",
    );

    const wrongId = createScriptedUiDriver([
      { kind: "promptText", interactionId: "expected", value: "value" },
    ]);
    await expect(
      createUiContext(app, { driver: wrongId }).promptText({ title: "Name" }, "actual"),
    ).rejects.toThrow("Expected UI interaction id expected");
  });

  it("reports unconsumed responses", () => {
    const driver = createScriptedUiDriver([{ kind: "promptText", interactionId: "unused", value: "value" }]);
    expect(() => driver.assertDone()).toThrow("unused");
  });

  it("can explicitly pass an interaction through to the real adapter", async () => {
    dialogMock.promptText.mockResolvedValueOnce("manual");
    const driver = createScriptedUiDriver([{ kind: "promptText", passthrough: true }]);
    const result = createUiContext(app, { driver }).promptText({ title: "Name" });

    await expect(result).resolves.toBe("manual");
    expect(dialogMock.promptText).toHaveBeenCalledWith(app, { title: "Name" });
    driver.assertDone();
  });

  it("falls back to real UI when no driver is configured", async () => {
    dialogMock.confirmAction.mockResolvedValueOnce("no");
    const result = createUiContext(app).confirmAction({
      title: "Confirm",
      message: "Proceed?",
      actions: ["yes", "no"] as const,
    });

    await expect(result).resolves.toBe("no");
    expect(dialogMock.confirmAction).toHaveBeenCalledOnce();
  });
});
