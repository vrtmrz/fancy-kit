# UI automation and scripted responses

## Why an instance-scoped context

Obsidian plugins often need to replace prompts and confirmations in automated tests. Storing reserved responses in modal class variables or module globals looks convenient, but makes the result dependent on test order and allows state to leak between parallel tests, plugins, app instances, and vaults.

The Obsidian adapter keeps this state explicit:

```ts
const ui = createObsidianUi(app, { driver });
```

Each test creates its own driver and context. Production code can create a context without a driver; in that case it opens the normal Obsidian UI.

## Reserving responses

```ts
import { createObsidianUi } from "@vrtmrz/obsidian-plugin-kit/ui";
import { createScriptedUiDriver } from "@vrtmrz/obsidian-plugin-kit/testing";

const driver = createScriptedUiDriver([
  {
    kind: "promptText",
    interactionId: "device-name",
    value: "test-device",
  },
  {
    kind: "pickOne",
    interactionId: "target",
    value: targetItem,
  },
  {
    kind: "confirmAction",
    interactionId: "apply",
    value: "yes",
  },
]);

const ui = createObsidianUi(app, { driver });
const name = await ui.promptText({ title: "Device name" }, "device-name");
const target = await ui.pickOne(
  { items, getText: (item) => item.name },
  "target",
);
const action = await ui.confirmAction(
  { title: "Apply", message: "Continue?", actions: ["yes", "no"] as const },
  "apply",
);

driver.assertDone();
```

The driver is FIFO and strict by default. It verifies the interaction kind and, when supplied, `interactionId`. `assertDone()` detects expected interactions that never occurred.

## Spying and transcripts

Every request is appended to `driver.transcript`. A response function can inspect the complete request before returning a value:

```ts
const driver = createScriptedUiDriver([
  {
    kind: "promptText",
    value: (request) => {
      expect(request.options.title).toBe("Device name");
      return "observed-device";
    },
  },
]);
```

Automated values are validated by the neutral interaction dispatcher:

- prompt responses must be a string or `null`;
- selection responses must be `null` or one of the supplied item instances;
- confirmation responses must be `null` or one of the supplied actions.

This prevents a scripted test from succeeding with a response the real UI could never produce.

## Passthrough

A step with `passthrough: true` records and validates the interaction, then opens the real UI. A non-strict driver also passes through interactions after its queue is empty. Prefer strict mode for deterministic automated tests.

## What not to do

- Do not assign a driver to a modal static property.
- Do not keep one scripted driver in a module singleton.
- Do not enable scripted responses from settings, URI parameters, or other production input.
- Do not use scripted responses to claim real UI coverage.

Use `createUiTestHarness` for App-free application-flow tests. Use `createObsidianUi` for mixed tests that may pass through to Obsidian, and use the showcase E2E suite for keyboard, focus, rendering, theme, Modal, SuggestModal, and Notice behaviour in real Obsidian.
