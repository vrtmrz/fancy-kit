# Browser UI usage guide

`@vrtmrz/browser-ui-kit` is the browser sibling of `@vrtmrz/obsidian-plugin-kit`. Both implement contracts owned by `@vrtmrz/ui-interactions`; neither application workflow needs to know which host is active.

## Composition

Create browser adapters once at the application boundary:

```ts
import {
  createBrowserUi,
  createBrowserUiNotifications,
} from "@vrtmrz/browser-ui-kit";
import type {
  UiInteractions,
  UiNotifications,
} from "@vrtmrz/ui-interactions";

const abortController = new AbortController();

const ui: UiInteractions = createBrowserUi({
  signal: abortController.signal,
  renderMarkdown: ({ container, markdown }) => {
    container.textContent = markdown;
  },
});
const notifications: UiNotifications = createBrowserUiNotifications();
```

Abort the interaction signal and dispose notifications during application shutdown. Aborting dismisses open dialogues as `null`; notification disposal hides all keyed messages and prevents later use.

## Rendering boundary

`DomBrowserInteractionPresenter` uses native DOM elements and can be replaced through `BrowserInteractionPresenter`. The presenter receives strings as opaque choice identifiers. `BrowserUiInteractions` retains typed action mapping and selected-object identity outside the renderer.

`DomBrowserNotificationPresenter` similarly owns visible elements while `BrowserUiNotifications` owns keys, expiry timers, updates, and terminal disposal. Reusing a notification key updates the existing view and restarts its expiry. Selecting an action hides the view before invoking the application callback.

## Markdown policy

The neutral interaction contract describes Markdown content but does not prescribe a parser. The browser kit defaults to `textContent`, which is safe and visibly preserves the supplied source. Applications which render Markdown must inject a renderer and own:

- parsing and sanitisation;
- relative-link handling through `sourcePath`;
- external-link security attributes; and
- cleanup for renderer-owned resources.

The callback may return cleanup work, which runs when the dialogue closes.

## Driver-aware tests

`createBrowserUi` accepts the same instance-scoped `UiInteractionDriver` used by other Fancy Kit hosts:

```ts
import { createBrowserUi } from "@vrtmrz/browser-ui-kit";
import { createScriptedUiDriver } from "@vrtmrz/ui-interactions/testing";

const driver = createScriptedUiDriver([
  { kind: "promptText", interactionId: "device-name", value: "browser" },
]);
const ui = createBrowserUi({ driver });

await ui.promptText({ title: "Device name" }, "device-name");
driver.assertDone();
```

A handled request does not require a DOM. A passed-through request invokes the configured presenter.
