# @vrtmrz/browser-ui-kit

Framework-free browser DOM implementations of Fancy Kit's neutral `UiInteractions` and `UiNotifications` contracts.

> [!IMPORTANT]
> This package is in initial `0.x` development. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly.

```bash
npm install @vrtmrz/browser-ui-kit @vrtmrz/ui-interactions
```

The package is ESM, has no framework dependency, and does not emulate Obsidian APIs. It uses native dialogue, form, button, and notification elements behind the same contracts implemented by `@vrtmrz/obsidian-plugin-kit`.

## Create browser UI

```ts
import {
  createBrowserUi,
  createBrowserUiNotifications,
} from "@vrtmrz/browser-ui-kit";

const abortController = new AbortController();
const ui = createBrowserUi({ signal: abortController.signal });
const notifications = createBrowserUiNotifications();

const name = await ui.promptText({ title: "Device name" }, "device-name");
notifications.show("ready", { message: `Ready: ${name ?? "unnamed"}` });

// In the owning application's shutdown lifecycle:
abortController.abort();
notifications.dispose();
```

Create both adapters at the browser application composition root. Application workflows should accept `UiInteractions`, `UiNotifications`, or a narrower structural subset from `@vrtmrz/ui-interactions`.

## Markdown rendering

Dialogue messages are assigned through `textContent` by default. Supply an application-owned renderer when the application needs Markdown:

```ts
const ui = createBrowserUi({
  renderMarkdown: ({ container, markdown, sourcePath }) => {
    container.replaceChildren(renderSafeMarkdown(markdown, sourcePath));
  },
});
```

The renderer owns parsing, sanitisation, relative-link policy, and any cleanup callback it returns. The kit never inserts application-supplied HTML by itself.

## Framework integration

`BrowserInteractionPresenter` and `BrowserNotificationPresenter` are narrow rendering boundaries. Supply a custom presenter to retain a React, Svelte, Vue, or other established interface while reusing the contract mapping, typed-selection identity, notification lifecycle, and test drivers.

See the [usage guide](docs/usage-guide.md) for driver composition, lifecycle rules, and focused entry points.

## Public entry points

| Entry point | Purpose |
| --- | --- |
| `@vrtmrz/browser-ui-kit` | All browser interaction and notification adapters |
| `@vrtmrz/browser-ui-kit/interactions` | `createBrowserUi`, native DOM presentation, and presenter contracts |
| `@vrtmrz/browser-ui-kit/notifications` | `createBrowserUiNotifications`, keyed lifecycle, and presenter contracts |
