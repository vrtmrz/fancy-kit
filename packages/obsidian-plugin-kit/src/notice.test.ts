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

    constructor(message: string | DocumentFragment, readonly duration = 4_000) {
      this.setMessage(message);
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

import { KeyedNoticeManager } from "./notice.js";

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
    expect((noticeState.instances[1] as NoticeMockInstance).messageEl.textContent).toBe("Second");
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
    expect(() => manager.show("key", "message", { durationMs: -1 })).toThrow(RangeError);
    expect(() => new KeyedNoticeManager({ defaultDurationMs: Number.NaN })).toThrow(RangeError);
  });
});
