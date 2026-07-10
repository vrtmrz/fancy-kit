# @vrtmrz/ui-interactions

Framework-neutral contracts for prompts, typed selection, Markdown actions, and messages, with instance-scoped interaction drivers for deterministic tests.

The package has no Obsidian or browser dependency. A platform adapter supplies real UI; tests can instead use the App-free harness.

```ts
import { createUiTestHarness } from "@vrtmrz/ui-interactions/testing";

const harness = createUiTestHarness([
  { kind: "promptText", interactionId: "device", value: "laptop" },
]);

const value = await harness.ui.promptText({ title: "Device name" }, "device");
harness.assertDone();
```

Dismissed prompts, selections, and actions resolve to `null`. An explicitly submitted empty string remains `""`. Typed selection preserves the identity of the selected item.
