// @vitest-environment jsdom

import type { UiNotification } from "@vrtmrz/ui-interactions";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BrowserUiNotifications,
  DomBrowserNotificationPresenter,
  type BrowserNotificationPresenter,
  type BrowserNotificationView,
} from "./notifications.js";

class RecordingView implements BrowserNotificationView {
  isConnected = true;
  readonly updates: UiNotification[] = [];
  hideCount = 0;

  constructor(notification: UiNotification) {
    this.updates.push(notification);
  }

  update(notification: UiNotification): void {
    this.updates.push(notification);
  }

  hide(): void {
    this.hideCount += 1;
    this.isConnected = false;
  }
}

class RecordingPresenter implements BrowserNotificationPresenter {
  readonly created: Array<{
    key: string;
    notification: UiNotification;
    view: RecordingView;
  }> = [];

  create(key: string, notification: UiNotification): BrowserNotificationView {
    const view = new RecordingView(notification);
    this.created.push({ key, notification, view });
    return view;
  }
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe("BrowserUiNotifications", () => {
  it("updates one view per key and restarts its expiry", async () => {
    vi.useFakeTimers();
    const presenter = new RecordingPresenter();
    const notifications = new BrowserUiNotifications({
      presenter,
      defaultDurationMs: 500,
    });

    notifications.show("sync", { message: "One" });
    const view = presenter.created[0]!.view;
    await vi.advanceTimersByTimeAsync(400);
    notifications.show("sync", { message: "Two" });

    expect(presenter.created).toHaveLength(1);
    expect(view.updates.map(({ message }) => message)).toEqual(["One", "Two"]);
    await vi.advanceTimersByTimeAsync(499);
    expect(notifications.has("sync")).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(notifications.has("sync")).toBe(false);
    expect(view.hideCount).toBe(1);
  });

  it("hides an action before invoking its callback", () => {
    const presenter = new RecordingPresenter();
    const notifications = new BrowserUiNotifications({
      presenter,
      defaultDurationMs: false,
    });
    const selected = vi.fn(() => {
      expect(notifications.has("conflict")).toBe(false);
    });

    notifications.show("conflict", {
      message: "Review",
      action: { label: "Open", onSelect: selected },
    });
    presenter.created[0]!.notification.action?.onSelect();

    expect(selected).toHaveBeenCalledOnce();
    expect(presenter.created[0]!.view.hideCount).toBe(1);
  });

  it("validates input and makes disposal terminal", () => {
    const notifications = new BrowserUiNotifications({
      presenter: new RecordingPresenter(),
      defaultDurationMs: false,
    });

    expect(() => notifications.show("", { message: "Invalid" })).toThrow(
      TypeError,
    );
    expect(() =>
      notifications.show("invalid", {
        message: "Invalid",
        durationMs: Number.NaN,
      }),
    ).toThrow(RangeError);

    notifications.show("active", { message: "Active" });
    notifications.dispose();
    expect(notifications.isDisposed).toBe(true);
    expect(() =>
      notifications.show("late", { message: "Late" }),
    ).toThrow(/disposed/);
  });
});

describe("DomBrowserNotificationPresenter", () => {
  it("renders plain text, updates an action, and removes an empty stack", () => {
    const presenter = new DomBrowserNotificationPresenter({ document });
    const action = vi.fn();
    const view = presenter.create("sync", {
      message: "<strong>Syncing</strong>",
    });

    const root = document.querySelector<HTMLElement>(
      "[data-notification-key='sync']",
    );
    expect(root?.textContent).toBe("<strong>Syncing</strong>");
    expect(root?.querySelector("strong")).toBeNull();
    expect(root?.getAttribute("role")).toBe("status");

    view.update({
      message: "Ready",
      action: { label: "Open", onSelect: action },
    });
    root?.querySelector("button")?.click();
    expect(action).toHaveBeenCalledOnce();

    view.hide();
    expect(document.querySelector(".vpk-browser-notification-stack")).toBeNull();
  });
});
