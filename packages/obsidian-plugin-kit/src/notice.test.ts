// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

interface NoticeMockInstance {
  messageEl: HTMLElement;
  duration: number;
  hidden: boolean;
  hide(): void;
}

const noticeState = vi.hoisted(() => ({ instances: [] as unknown[] }));

vi.mock("obsidian", () => {
  class Notice {
    messageEl = document.createElement("div");
    hidden = false;

    constructor(
      message: string | DocumentFragment,
      readonly duration = 4_000,
    ) {
      this.setMessage(message);
      this.messageEl.addEventListener("click", () => {
        // Obsidian begins a hide transition immediately, while the Notice DOM
        // can remain connected until that transition completes.
        this.hidden = true;
        this.messageEl.style.display = "none";
      });
      document.body.append(this.messageEl);
      noticeState.instances.push(this);
    }

    setMessage(message: string | DocumentFragment): this {
      this.messageEl.replaceChildren();
      if (typeof message === "string") this.messageEl.textContent = message;
      else this.messageEl.append(message);
      return this;
    }

    hide(): void {
      this.hidden = true;
      this.messageEl.remove();
    }
  }

  return { Notice };
});

import { KeyedNoticeGroupManager, KeyedNoticeManager } from "./notice.js";

afterEach(() => {
  vi.useRealTimers();
  noticeState.instances.length = 0;
  document.body.replaceChildren();
});

describe("KeyedNoticeManager", () => {
  it("updates one Notice per key and restarts its expiry", async () => {
    vi.useFakeTimers();
    const manager = new KeyedNoticeManager({ defaultDurationMs: 500 });
    const first = manager.show("scan", "Scanning 1");
    const notice = noticeState.instances[0] as NoticeMockInstance;

    expect(notice.duration).toBe(0);
    expect(notice.messageEl.classList.contains("vpk-keyed-notice")).toBe(true);
    await vi.advanceTimersByTimeAsync(400);

    const updated = manager.show("scan", "Scanning 2");
    expect(updated).toBe(first);
    expect(noticeState.instances).toHaveLength(1);
    expect(notice.messageEl.textContent).toBe("Scanning 2");

    await vi.advanceTimersByTimeAsync(499);
    expect(notice.hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(notice.hidden).toBe(true);
    expect(manager.has("scan")).toBe(false);
  });

  it("keeps persistent Notices visible until explicitly hidden", async () => {
    vi.useFakeTimers();
    const manager = new KeyedNoticeManager();
    manager.show("persistent", "Waiting", { durationMs: false });
    const notice = noticeState.instances[0] as NoticeMockInstance;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(notice.hidden).toBe(false);
    expect(manager.hide("persistent")).toBe(true);
    expect(manager.hide("persistent")).toBe(false);
    expect(notice.hidden).toBe(true);
  });

  it("recreates a Notice dismissed outside the manager", () => {
    const manager = new KeyedNoticeManager({ defaultDurationMs: false });
    const first = manager.show("sync", "First");
    (noticeState.instances[0] as NoticeMockInstance).hide();

    const second = manager.show("sync", "Second");

    expect(second).not.toBe(first);
    expect(noticeState.instances).toHaveLength(2);
    expect(
      (noticeState.instances[1] as NoticeMockInstance).messageEl.textContent,
    ).toBe("Second");
  });

  it("hides every owned Notice, remains reusable, and prevents use after disposal", () => {
    const manager = new KeyedNoticeManager({ defaultDurationMs: false });
    manager.show("a", "A");
    manager.show("b", "B");

    manager.hideAll();
    expect((noticeState.instances[0] as NoticeMockInstance).hidden).toBe(true);
    expect((noticeState.instances[1] as NoticeMockInstance).hidden).toBe(true);
    manager.show("c", "C");

    manager.dispose();
    manager.dispose();

    expect(manager.isDisposed).toBe(true);
    expect((noticeState.instances[2] as NoticeMockInstance).hidden).toBe(true);
    expect(() => manager.show("d", "D")).toThrow("disposed");
  });

  it("rejects empty keys and invalid durations", () => {
    const manager = new KeyedNoticeManager();
    expect(() => manager.show("", "message")).toThrow(TypeError);
    expect(() => manager.show("key", "message", { durationMs: -1 })).toThrow(
      RangeError,
    );
    expect(
      () => new KeyedNoticeManager({ defaultDurationMs: Number.NaN }),
    ).toThrow(RangeError);
  });
});

describe("KeyedNoticeGroupManager", () => {
  it("keeps named messages in one Notice and separates them into rows", () => {
    const manager = new KeyedNoticeGroupManager();

    const first = manager.setItem("integrity", "checking", {
      message: "Checking for incomplete documents...",
    });
    const second = manager.setItem("integrity", "result", {
      message: "No size mismatches found",
    });

    expect(second).toBe(first);
    expect(noticeState.instances).toHaveLength(1);
    expect(
      [...document.querySelectorAll(".vpk-keyed-notice-group__item")].map(
        (element) => element.textContent,
      ),
    ).toEqual([
      "Checking for incomplete documents...",
      "No size mismatches found",
    ]);
  });

  it("updates a named row in place and invokes its current action", () => {
    const firstAction = vi.fn();
    const updatedAction = vi.fn();
    const manager = new KeyedNoticeGroupManager();
    manager.setItem("settings", "plugin:a", {
      message: "Plug-in A changed",
      action: { label: "Reload A", onSelect: firstAction },
    });
    manager.setItem("settings", "restart", {
      message: "Other settings changed",
    });

    manager.setItem("settings", "plugin:a", {
      message: "Plug-in A changed again",
      action: { label: "Reload plug-in A", onSelect: updatedAction },
    });

    const items = [
      ...document.querySelectorAll(".vpk-keyed-notice-group__item"),
    ];
    expect(items.map((element) => element.dataset.itemKey)).toEqual([
      "plugin:a",
      "restart",
    ]);
    expect(items[0]?.textContent).toBe(
      "Plug-in A changed againReload plug-in A",
    );

    const button = document.querySelector<HTMLButtonElement>(
      ".vpk-keyed-notice-group__action",
    );
    expect(button?.style.minHeight).toContain("44px");
    button?.click();
    expect(firstAction).not.toHaveBeenCalled();
    expect(updatedAction).toHaveBeenCalledOnce();
  });

  it("stays visible while active and expires only after finish", async () => {
    vi.useFakeTimers();
    const manager = new KeyedNoticeGroupManager({
      defaultCompletedDurationMs: 500,
    });
    manager.setItem("integrity", "checking", { message: "Checking" });
    const notice = noticeState.instances[0] as NoticeMockInstance;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(notice.hidden).toBe(false);
    expect(manager.finish("integrity")).toBe(true);
    await vi.advanceTimersByTimeAsync(400);

    manager.setItem("integrity", "result", { message: "Still working" });
    await vi.advanceTimersByTimeAsync(500);
    expect(notice.hidden).toBe(false);

    expect(manager.finish("integrity")).toBe(true);
    await vi.advanceTimersByTimeAsync(499);
    expect(notice.hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(notice.hidden).toBe(true);
    expect(manager.has("integrity")).toBe(false);
  });

  it("starts a fresh group after the user dismisses the Notice", () => {
    const manager = new KeyedNoticeGroupManager();
    const first = manager.setItem("integrity", "checking", {
      message: "Checking",
    });
    (noticeState.instances[0] as NoticeMockInstance).hide();

    const second = manager.setItem("integrity", "result", {
      message: "Complete",
    });

    expect(second).not.toBe(first);
    expect(noticeState.instances).toHaveLength(2);
    expect(
      [...document.querySelectorAll(".vpk-keyed-notice-group__item")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["Complete"]);
  });

  it("starts a fresh group while a clicked Notice is still connected during its hide transition", () => {
    const manager = new KeyedNoticeGroupManager();
    const first = manager.setItem("settings", "alpha", {
      message: "Alpha changed",
    });
    manager.setItem("settings", "beta", { message: "Beta changed" });

    document
      .querySelector<HTMLElement>(".vpk-keyed-notice-group__message")
      ?.click();
    expect(
      (noticeState.instances[0] as NoticeMockInstance).messageEl.isConnected,
    ).toBe(true);

    const second = manager.setItem("settings", "gamma", {
      message: "Gamma changed",
    });

    expect(second).not.toBe(first);
    expect(noticeState.instances).toHaveLength(2);
    expect(
      (noticeState.instances[1] as NoticeMockInstance).messageEl.textContent,
    ).toBe("Gamma changed");
  });

  it("removes rows, hides groups, validates input, and disposes safely", () => {
    const manager = new KeyedNoticeGroupManager();
    manager.setItem("settings", "a", { message: "A" });
    manager.setItem("settings", "b", { message: "B" });

    expect(manager.removeItem("settings", "a")).toBe(true);
    expect(manager.has("settings")).toBe(true);
    expect(manager.removeItem("settings", "b")).toBe(true);
    expect(manager.has("settings")).toBe(false);
    expect(manager.removeItem("settings", "missing")).toBe(false);
    expect(manager.finish("missing")).toBe(false);

    expect(() => manager.setItem("", "item", { message: "A" })).toThrow(
      TypeError,
    );
    expect(() => manager.setItem("group", "", { message: "A" })).toThrow(
      TypeError,
    );
    expect(() =>
      manager.setItem("group", "item", {
        message: "A",
        action: { label: "", onSelect: vi.fn() },
      }),
    ).toThrow(TypeError);
    expect(
      () => new KeyedNoticeGroupManager({ defaultCompletedDurationMs: -1 }),
    ).toThrow(RangeError);

    manager.setItem("group", "item", { message: "A" });
    manager.dispose();
    manager.dispose();
    expect(manager.isDisposed).toBe(true);
    expect(() => manager.setItem("group", "item", { message: "B" })).toThrow(
      "disposed",
    );
  });
});
