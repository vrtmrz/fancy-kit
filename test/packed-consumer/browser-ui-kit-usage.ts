import {
  createBrowserUi,
  createBrowserUiNotifications,
  type BrowserMarkdownRenderer,
} from "@vrtmrz/browser-ui-kit";
import type {
  UiInteractions,
  UiNotifications,
} from "@vrtmrz/ui-interactions";

declare const document: Document;

const renderMarkdown: BrowserMarkdownRenderer = ({
  container,
  markdown,
  sourcePath,
}) => {
  container.textContent = `${sourcePath ?? ""}${markdown}`;
};

const controller = new AbortController();
const ui: UiInteractions = createBrowserUi({
  document,
  renderMarkdown,
  signal: controller.signal,
});
const notifications: UiNotifications = createBrowserUiNotifications({
  document,
  defaultDurationMs: false,
});

void ui.confirmAction({
  title: "Continue?",
  message: "**Browser adapter**",
  actions: ["continue", "cancel"],
  labels: {
    continue: "Continue",
    cancel: "Cancel",
  },
  defaultAction: "cancel",
  timeoutMs: 30_000,
});
notifications.show("ready", {
  message: "Ready",
  action: {
    label: "Dismiss",
    onSelect: () => notifications.hide("ready"),
  },
  durationMs: false,
});
controller.abort();
notifications.dispose();
