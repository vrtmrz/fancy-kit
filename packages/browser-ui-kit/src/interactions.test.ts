// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BrowserUiInteractions,
  DomBrowserInteractionPresenter,
  type BrowserChoiceRequest,
  type BrowserInteractionPresenter,
  type BrowserPromptRequest,
} from "./interactions.js";

class RecordingPresenter implements BrowserInteractionPresenter {
  readonly prompts: BrowserPromptRequest[] = [];
  readonly choices: BrowserChoiceRequest[] = [];
  promptResult: string | null = null;
  choiceResult: string | null = null;

  prompt(request: BrowserPromptRequest): Promise<string | null> {
    this.prompts.push(request);
    return Promise.resolve(this.promptResult);
  }

  choose(request: BrowserChoiceRequest): Promise<string | null> {
    this.choices.push(request);
    return Promise.resolve(this.choiceResult);
  }
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("BrowserUiInteractions", () => {
  it("maps typed actions without changing the millisecond timeout contract", async () => {
    const presenter = new RecordingPresenter();
    presenter.choiceResult = "action:1";
    const ui = new BrowserUiInteractions(presenter);

    const selected = await ui.confirmAction(
      {
        title: "Connection request",
        message: "Allow this peer?",
        actions: ["deny", "accept"] as const,
        labels: { deny: "Ignore", accept: "Accept" },
        defaultAction: "deny",
        timeoutMs: 30_000,
        actionLayout: "vertical",
        sourcePath: "peer.md",
      },
      "peer-auth",
    );

    expect(selected).toBe("accept");
    expect(presenter.choices).toEqual([
      {
        title: "Connection request",
        message: "Allow this peer?",
        choices: [
          { id: "action:0", label: "Ignore" },
          { id: "action:1", label: "Accept" },
        ],
        defaultChoiceId: "action:0",
        timeoutMs: 30_000,
        actionLayout: "vertical",
        sourcePath: "peer.md",
        interactionId: "peer-auth",
      },
    ]);
  });

  it("returns the original selected item and rejects malformed presenter identifiers", async () => {
    const presenter = new RecordingPresenter();
    const first = { name: "First" };
    const second = { name: "Second" };
    const ui = new BrowserUiInteractions(presenter);

    presenter.choiceResult = "item:1";
    await expect(
      ui.pickOne({
        items: [first, second],
        getText: (item) => item.name,
      }),
    ).resolves.toBe(second);

    presenter.choiceResult = "item:1:extra";
    await expect(
      ui.pickOne({
        items: [first, second],
        getText: (item) => item.name,
      }),
    ).resolves.toBeNull();
  });
});

describe("DomBrowserInteractionPresenter", () => {
  it("retains native dialogue centring when the host resets element margins", async () => {
    const hostReset = document.createElement("style");
    hostReset.textContent = "* { margin: 0; }";
    document.head.append(hostReset);
    try {
      const presenter = new DomBrowserInteractionPresenter({ document });
      const result = presenter.choose({
        title: "Connection request",
        message: "Allow this peer?",
        choices: [{ id: "accept", label: "Accept" }],
      });

      const dialogue = document.querySelector("dialog");
      expect(dialogue?.style.margin).toBe("auto");

      dialogue?.querySelector<HTMLButtonElement>("button")?.click();
      await expect(result).resolves.toBe("accept");
    } finally {
      hostReset.remove();
    }
  });

  it("submits a password prompt through native form controls", async () => {
    const presenter = new DomBrowserInteractionPresenter({ document });
    const result = presenter.prompt({
      title: "Password",
      inputType: "password",
      initialValue: "secret",
      submitLabel: "Continue",
    });

    const dialogue = document.querySelector("dialog");
    const input = dialogue?.querySelector("input");
    const form = dialogue?.querySelector("form");
    expect(dialogue?.hasAttribute("open")).toBe(true);
    expect(input?.type).toBe("password");
    expect(input?.autocomplete).toBe("current-password");

    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await expect(result).resolves.toBe("secret");
    expect(document.querySelector("dialog")).toBeNull();
  });

  it("renders Markdown as plain text by default and honours timeoutMs", async () => {
    vi.useFakeTimers();
    const presenter = new DomBrowserInteractionPresenter({ document });
    const result = presenter.choose({
      title: "Choose",
      message: "<img src=x onerror=alert(1)>",
      choices: [
        { id: "ignore", label: "Ignore" },
        { id: "accept", label: "Accept" },
      ],
      defaultChoiceId: "ignore",
      timeoutMs: 50,
    });

    const message = document.querySelector(
      ".vpk-browser-dialog__message",
    );
    expect(message?.textContent).toBe("<img src=x onerror=alert(1)>");
    expect(message?.querySelector("img")).toBeNull();

    await vi.advanceTimersByTimeAsync(49);
    expect(document.querySelector("dialog")).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe("ignore");
    expect(document.querySelector("dialog")).toBeNull();
  });

  it("cleans up injected Markdown when an abort signal dismisses the dialogue", async () => {
    const abort = new AbortController();
    const dispose = vi.fn();
    const renderMarkdown = vi.fn(({ container }: { container: HTMLElement }) => {
      container.textContent = "Rendered";
      return dispose;
    });
    const presenter = new DomBrowserInteractionPresenter({
      document,
      renderMarkdown,
      signal: abort.signal,
    });
    const result = presenter.choose({
      title: "Review",
      message: "**Rendered**",
      choices: [{ id: "close", label: "Close" }],
      sourcePath: "review.md",
    });

    abort.abort();

    await expect(result).resolves.toBeNull();
    expect(renderMarkdown).toHaveBeenCalledWith({
      container: expect.any(HTMLElement),
      markdown: "**Rendered**",
      sourcePath: "review.md",
    });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("rejects invalid timeout values before presenting a dialogue", async () => {
    const presenter = new DomBrowserInteractionPresenter({ document });

    await expect(
      presenter.choose({
        title: "Choose",
        message: "",
        choices: [],
        timeoutMs: -1,
      }),
    ).rejects.toThrow(RangeError);
    expect(document.querySelector("dialog")).toBeNull();
  });
});
