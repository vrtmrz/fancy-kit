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
      if (typeof message === "string") this.messageEl.textContent = message;
      else this.messageEl.append(message);
      noticeState.instances.push(this);
    }

    hide(): void {
      this.hidden = true;
    }
  }

  return { Notice };
});

import { ProgressFragment, ProgressNotice, showProgressNotice } from "./progress.js";

afterEach(() => {
  vi.useRealTimers();
  noticeState.instances.length = 0;
});

describe("ProgressFragment", () => {
  it("renders an indeterminate progress bar and updates all visible fields", () => {
    const progress = new ProgressFragment({ title: "Scanning" });
    const bar = progress.element.querySelector("progress");

    expect(progress.fragment.firstChild).toBe(progress.element);
    expect(bar?.hasAttribute("value")).toBe(false);

    progress.update({ value: 2, total: 5, title: "Archiving", note: "note.md" });

    expect(progress.element.querySelector(".vpk-progress__title")?.textContent).toBe("Archiving");
    expect(progress.element.querySelector(".vpk-progress__numeric")?.textContent).toBe("2 / 5");
    expect(progress.element.querySelector(".vpk-progress__note")?.textContent).toBe("note.md");
    expect((bar as HTMLProgressElement).value).toBe(2);
    expect((bar as HTMLProgressElement).max).toBe(5);
  });

  it("supports custom numeric formatting and collapsing", () => {
    const progress = new ProgressFragment({
      total: 1_024,
      formatNumeric: ({ value, total }) => `${value} B of ${total} B`,
    });

    progress.update({ value: 512, collapsed: true });

    expect(progress.element.querySelector(".vpk-progress__numeric")?.textContent).toBe("512 B of 1024 B");
    expect(progress.element.style.display).toBe("none");
  });

  it("auto-completes once and emits one progress event for the terminal update", () => {
    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const progress = new ProgressFragment({ total: 2, onProgress, onComplete });

    progress.increment();
    progress.increment();
    progress.increment();

    expect(progress.isCompleted).toBe(true);
    expect(progress.snapshot.state).toBe("completed");
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("supports dynamic totals through explicit completion", () => {
    const onComplete = vi.fn();
    const progress = new ProgressFragment({ autoComplete: false, total: 1, onComplete });

    progress.value = 1;
    progress.total = 3;
    progress.value = 3;
    expect(progress.isCompleted).toBe(false);

    progress.complete("Finished");
    expect(progress.isCompleted).toBe(true);
    expect(progress.note).toBe("Finished");
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("cancels once and uses the cancelled numeric state", () => {
    const onCancel = vi.fn();
    const progress = new ProgressFragment({ value: 1, total: 4, onCancel });

    progress.cancel("Stopped");
    progress.cancel("Again");

    expect(progress.isCancelled).toBe(true);
    expect(progress.note).toBe("Stopped");
    expect(progress.element.querySelector(".vpk-progress__numeric")?.textContent).toBe("— / —");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("rejects invalid values", () => {
    expect(() => new ProgressFragment({ total: -1 })).toThrow(RangeError);
    const progress = new ProgressFragment();
    expect(() => progress.increment(Number.NaN)).toThrow(RangeError);
  });
});

describe("ProgressNotice", () => {
  it("puts a progress fragment in a persistent Notice and hides after completion", async () => {
    vi.useFakeTimers();
    const progressNotice = showProgressNotice({ title: "Uploading", total: 2, hideOnCompleteMs: 500 });
    const notice = noticeState.instances[0] as NoticeMockInstance;

    expect(progressNotice).toBeInstanceOf(ProgressNotice);
    expect(notice.duration).toBe(0);
    expect(notice.messageEl.classList.contains("vpk-progress-notice")).toBe(true);
    expect(notice.messageEl.querySelector(".vpk-progress")).toBe(progressNotice.progress.element);

    progressNotice.increment(2);
    expect(notice.hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(notice.hidden).toBe(true);
  });

  it("can remain visible after completion and be hidden explicitly", () => {
    const progressNotice = new ProgressNotice({ total: 1, hideOnCompleteMs: false });
    const notice = noticeState.instances[0] as NoticeMockInstance;

    progressNotice.complete("Done");
    expect(notice.hidden).toBe(false);

    progressNotice.hide();
    expect(notice.hidden).toBe(true);
  });
});
