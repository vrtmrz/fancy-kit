import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type { App } from "obsidian";

interface FakeElement {
  text: string;
  emptied: boolean;
  children: FakeElement[];
  setText(value: string): void;
  empty(): void;
  createDiv(options?: { text?: string; cls?: string }): FakeElement;
}

interface FakeInput {
  type: string;
  value: string;
  placeholder: string;
  focused: boolean;
  selected: boolean;
  emit(value: string): void;
  keydown(event: { key: string; isComposing: boolean; preventDefault(): void }): void;
}

interface FakeButton {
  text: string;
  cta: boolean;
  click(): void;
}

interface FakeModal {
  contentEl: FakeElement;
  close(): void;
  getItems?(): unknown[];
  getItemText?(item: unknown): string;
  onChooseItem?(item: unknown, event: KeyboardEvent): void;
  renderSuggestion?(match: { item: unknown; match: unknown }, element: FakeElement): void;
}

interface FakeComponent {
  loaded: boolean;
  unloaded: boolean;
}

const mockState = vi.hoisted(() => ({
  modals: [] as unknown[],
  inputs: [] as unknown[],
  buttons: [] as unknown[],
  components: [] as unknown[],
  markdownCalls: [] as Array<{ markdown: string; sourcePath: string }>,
}));

vi.mock("obsidian", () => {
  class ElementMock implements FakeElement {
    text = "";
    emptied = false;
    children: ElementMock[] = [];

    setText(value: string): void {
      this.text = value;
    }

    empty(): void {
      this.emptied = true;
      this.children = [];
    }

    createDiv(options?: { text?: string; cls?: string }): ElementMock {
      const child = new ElementMock();
      child.text = options?.text ?? "";
      this.children.push(child);
      return child;
    }
  }

  class Modal {
    app: App;
    titleEl = new ElementMock();
    contentEl = new ElementMock();
    private openState = false;

    constructor(app: App) {
      this.app = app;
      mockState.modals.push(this);
    }

    open(): void {
      this.openState = true;
      this.onOpen();
    }

    close(): void {
      if (!this.openState) return;
      this.openState = false;
      this.onClose();
    }

    onOpen(): void {}
    onClose(): void {}

    setTitle(title: string): this {
      this.titleEl.setText(title);
      return this;
    }
  }

  class FuzzySuggestModal<T> extends Modal {
    placeholder = "";

    setPlaceholder(placeholder: string): this {
      this.placeholder = placeholder;
      return this;
    }

    renderSuggestion(match: { item: T }, element: FakeElement): void {
      const modal = this as unknown as { getItemText(item: T): string };
      element.createDiv({ text: modal.getItemText(match.item) });
    }
  }

  class TextComponent {
    private changeHandler: ((value: string) => void) | undefined;
    private keydownHandler:
      | ((event: { key: string; isComposing: boolean; preventDefault(): void }) => void)
      | undefined;

    inputEl = {
      type: "text",
      value: "",
      placeholder: "",
      focused: false,
      selected: false,
      focus: () => {
        this.inputEl.focused = true;
      },
      select: () => {
        this.inputEl.selected = true;
      },
      addEventListener: (
        event: string,
        handler: (event: { key: string; isComposing: boolean; preventDefault(): void }) => void,
      ) => {
        if (event === "keydown") this.keydownHandler = handler;
      },
    };

    constructor() {
      mockState.inputs.push(this);
    }

    setValue(value: string): this {
      this.inputEl.value = value;
      return this;
    }

    setPlaceholder(value: string): this {
      this.inputEl.placeholder = value;
      return this;
    }

    onChange(handler: (value: string) => void): this {
      this.changeHandler = handler;
      return this;
    }

    emit(value: string): void {
      this.inputEl.value = value;
      this.changeHandler?.(value);
    }

    keydown(event: { key: string; isComposing: boolean; preventDefault(): void }): void {
      this.keydownHandler?.(event);
    }
  }

  class ButtonComponent {
    text = "";
    cta = false;
    private clickHandler: (() => void) | undefined;

    constructor() {
      mockState.buttons.push(this);
    }

    setButtonText(value: string): this {
      this.text = value;
      return this;
    }

    setCta(): this {
      this.cta = true;
      return this;
    }

    onClick(handler: () => void): this {
      this.clickHandler = handler;
      return this;
    }

    click(): void {
      this.clickHandler?.();
    }
  }

  class Setting {
    constructor(_container: FakeElement) {}
    setName(_name: string): this {
      return this;
    }
    setDesc(_description: string): this {
      return this;
    }
    addText(callback: (input: TextComponent) => void): this {
      callback(new TextComponent());
      return this;
    }
    addButton(callback: (button: ButtonComponent) => void): this {
      callback(new ButtonComponent());
      return this;
    }
  }

  class Component {
    loaded = false;
    unloaded = false;

    constructor() {
      mockState.components.push(this);
    }

    load(): void {
      this.loaded = true;
    }

    unload(): void {
      this.unloaded = true;
    }
  }

  const MarkdownRenderer = {
    render: async (
      _app: App,
      markdown: string,
      _element: FakeElement,
      sourcePath: string,
      _component: Component,
    ) => {
      mockState.markdownCalls.push({ markdown, sourcePath });
    },
  };

  return { Component, FuzzySuggestModal, MarkdownRenderer, Modal, Setting };
});

import { confirmAction, pickOne, promptPassword, promptText, showMessage } from "./dialog.js";

const app = {} as App;

function last<T>(items: unknown[]): T {
  const item = items.at(-1);
  if (item === undefined) throw new Error("Expected a captured mock instance");
  return item as T;
}

afterEach(() => {
  vi.useRealTimers();
  mockState.modals.length = 0;
  mockState.inputs.length = 0;
  mockState.buttons.length = 0;
  mockState.components.length = 0;
  mockState.markdownCalls.length = 0;
});

describe("promptText", () => {
  it("preserves an explicitly submitted empty string", async () => {
    const result = promptText(app, { title: "Name", placeholder: "Device name" });
    const input = last<TextComponent & FakeInput>(mockState.inputs);
    const [submit] = mockState.buttons as FakeButton[];

    expect(input.inputEl.placeholder).toBe("Device name");
    expect(input.inputEl.focused).toBe(true);
    input.emit("");
    submit.click();

    await expect(result).resolves.toBe("");
  });

  it("submits the current value with Enter and selects an initial value", async () => {
    const result = promptText(app, {
      title: "Name",
      initialValue: "before",
      selectInitialValue: true,
    });
    const input = last<TextComponent & FakeInput>(mockState.inputs);
    const preventDefault = vi.fn();

    expect(input.inputEl.value).toBe("before");
    expect(input.inputEl.selected).toBe(true);
    input.emit("after");
    input.keydown({ key: "Enter", isComposing: false, preventDefault });

    expect(preventDefault).toHaveBeenCalledOnce();
    await expect(result).resolves.toBe("after");
  });

  it("does not submit while an IME composition is active", async () => {
    const result = promptText(app, { title: "Name", initialValue: "入力中" });
    const input = last<TextComponent & FakeInput>(mockState.inputs);
    const modal = last<FakeModal>(mockState.modals);

    input.keydown({ key: "Enter", isComposing: true, preventDefault: vi.fn() });
    modal.close();

    await expect(result).resolves.toBeNull();
  });

  it("returns null when the modal is closed", async () => {
    const result = promptText(app, { title: "Name" });
    const modal = last<FakeModal>(mockState.modals);

    modal.close();
    modal.close();

    await expect(result).resolves.toBeNull();
  });

  it("uses a password input for promptPassword", async () => {
    const result = promptPassword(app, { title: "Passphrase" });
    const input = last<TextComponent & FakeInput>(mockState.inputs);
    const modal = last<FakeModal>(mockState.modals);

    expect(input.inputEl.type).toBe("password");
    modal.close();
    await result;
  });
});

describe("pickOne", () => {
  const first = { id: 1, name: "First" };
  const second = { id: 2, name: "Second" };

  it("keeps item identity and resolves a selected item", async () => {
    const result = pickOne(app, {
      items: [first, second],
      getText: (item) => item.name,
      placeholder: "Choose",
    });
    const modal = last<FakeModal>(mockState.modals);

    expect(modal.getItems?.()).toEqual([first, second]);
    expect(modal.getItemText?.(second)).toBe("Second");
    // Obsidian may close the suggest modal before it dispatches the chosen item.
    modal.close();
    modal.onChooseItem?.(second, {} as KeyboardEvent);

    await expect(result).resolves.toBe(second);
  });

  it("returns null when dismissed", async () => {
    const result = pickOne(app, { items: [first], getText: (item) => item.name });
    last<FakeModal>(mockState.modals).close();
    await expect(result).resolves.toBeNull();
  });

  it("renders optional secondary item text", () => {
    void pickOne(app, {
      items: [first],
      getText: (item) => item.name,
      getDescription: (item) => `Items/${item.name}.md`,
    });
    const modal = last<FakeModal>(mockState.modals);

    modal.renderSuggestion?.({ item: first, match: [] }, modal.contentEl);

    expect(modal.getItemText?.(first)).toBe("First");
    expect(modal.contentEl.children.map((child) => child.text)).toEqual([
      "First",
      "Items/First.md",
    ]);
  });
});

describe("confirmAction", () => {
  it("renders Markdown and resolves the selected literal action", async () => {
    const result = confirmAction(app, {
      title: "Confirm",
      message: "**Proceed?**",
      sourcePath: "note.md",
      actions: ["apply", "cancel"] as const,
      labels: { apply: "Apply", cancel: "Cancel" },
      defaultAction: "apply",
    });
    expectTypeOf(result).toEqualTypeOf<Promise<"apply" | "cancel" | null>>();

    const [apply, cancel] = mockState.buttons as FakeButton[];
    const component = last<FakeComponent>(mockState.components);
    expect(mockState.markdownCalls).toEqual([{ markdown: "**Proceed?**", sourcePath: "note.md" }]);
    expect(apply.text).toBe("Apply");
    expect(apply.cta).toBe(true);
    expect(cancel.cta).toBe(false);
    expect(component.loaded).toBe(true);

    cancel.click();

    await expect(result).resolves.toBe("cancel");
    expect(component.unloaded).toBe(true);
  });

  it("selects the default action after a timeout", async () => {
    vi.useFakeTimers();
    const result = confirmAction(app, {
      title: "Confirm",
      message: "Proceed?",
      actions: ["proceed", "cancel"] as const,
      defaultAction: "cancel",
      timeoutMs: 1_000,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toBe("cancel");
  });

  it("returns null when dismissed", async () => {
    const result = confirmAction(app, {
      title: "Confirm",
      message: "Proceed?",
      actions: ["yes", "no"] as const,
    });

    last<FakeModal>(mockState.modals).close();
    await expect(result).resolves.toBeNull();
  });
});

describe("showMessage", () => {
  it("resolves after its close action", async () => {
    const result = showMessage(app, { title: "Done", message: "Finished", closeLabel: "OK" });
    const [close] = mockState.buttons as FakeButton[];

    expect(close.text).toBe("OK");
    close.click();

    await expect(result).resolves.toBeUndefined();
  });
});
