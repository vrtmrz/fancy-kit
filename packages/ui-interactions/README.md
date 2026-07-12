# @vrtmrz/ui-interactions

Framework-neutral contracts for prompts, typed selection, Markdown actions, and messages, with instance-scoped interaction drivers for deterministic tests.

The package has no Obsidian or browser dependency. A platform adapter supplies real UI; tests can instead use the App-free harness.

> [!IMPORTANT]
> This package is in initial `0.x` development. Pin an exact version when controlled upgrades are important.

```bash
npm install --save-exact @vrtmrz/ui-interactions
```

## Public entry points

- `@vrtmrz/ui-interactions` exports the interaction contracts and driver-backed dispatcher.
- `@vrtmrz/ui-interactions/testing` exports the strict scripted driver, transcript, and App-free test harness.

## Test harness

```ts
import { createUiTestHarness } from "@vrtmrz/ui-interactions/testing";

const harness = createUiTestHarness([
  { kind: "promptText", interactionId: "device", value: "laptop" },
]);

const value = await harness.ui.promptText({ title: "Device name" }, "device");
harness.assertDone();
```

Dismissed prompts, selections, and actions resolve to `null`. An explicitly submitted empty string remains `""`. Typed selection preserves the identity of the selected item.

Scripted responses are FIFO and instance-scoped. A step's `kind` determines the request type seen by a response callback and the accepted response value. Call `assertDone()` at the end of a test to detect expected interactions that did not occur. Production adapters should use `createDrivenUiInteractions` or extend `DrivenUiInteractions`; they must not expose scripted responses through settings or global state.
