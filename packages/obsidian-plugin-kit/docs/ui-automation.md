# UI automation and scripted responses

For the package-wide integration path, begin with the [usage guide](usage-guide.md). This document provides the detailed UI driver rules.

## Why an instance-scoped context

Obsidian plugins often need to replace prompts and confirmations in automated tests. Storing reserved responses in modal class variables or module globals looks convenient, but makes the result dependent on test order and allows state to leak between parallel tests, plugins, app instances, and vaults.

The Obsidian adapter keeps this state explicit:

```ts
const ui = createObsidianUi(app, { driver });
```

Each test creates its own driver and context. Production code can create a context without a driver; in that case it opens the normal Obsidian UI.

## Application workflow boundary

Keep the interaction capability at the application boundary instead of importing a modal inside business-flow code. A plug-in instance owns the Obsidian adapter and passes it to a focused workflow:

```ts
import { createObsidianUi, type UiInteractions } from "@vrtmrz/obsidian-plugin-kit/ui";

async function confirmRestore(ui: UiInteractions): Promise<boolean> {
  const action = await ui.confirmAction(
    {
      title: "Restore confirmation",
      message: "Restore the selected files?",
      actions: ["restore", "cancel"] as const,
      labels: { restore: "Restore", cancel: "Cancel" },
      defaultAction: "cancel",
    },
    "restore-files",
  );
  return action === "restore";
}

const ui = createObsidianUi(app);
await confirmRestore(ui);
```

Use stable machine-readable action identifiers and keep visible labels separate. Closing the dialog returns `null`, so application code must map both `null` and an explicit cancel action to its cancellation path.

The same workflow can be tested without constructing an Obsidian `App`:

```ts
import { createUiTestHarness } from "@vrtmrz/obsidian-plugin-kit/testing";

const harness = createUiTestHarness([
  {
    kind: "confirmAction",
    interactionId: "restore-files",
    value: "restore",
  },
]);

expect(await confirmRestore(harness.ui)).toBe(true);
expect(harness.transcript[0]?.kind).toBe("confirmAction");
harness.assertDone();
```

This shape keeps Obsidian rendering in the adapter, application policy in the consumer workflow, and scripted state in the individual test harness.

### Narrowing a domain operation

`UiInteractions` deliberately describes reusable interaction mechanisms. When a workflow has a smaller domain contract, define that contract in the consumer and adapt the shared capability at its boundary. This gives a mock or spy the exact domain result type without adding application-specific actions to the kit:

```ts
import { vi } from "vitest";
import type { UiInteractions } from "@vrtmrz/obsidian-plugin-kit/ui";

type MaintenanceDecision = "apply" | "cancel" | null;

interface MaintenancePrompts {
  confirmPrerequisites(): Promise<MaintenanceDecision>;
}

function createMaintenancePrompts(
  ui: Pick<UiInteractions, "confirmAction">,
): MaintenancePrompts {
  return {
    confirmPrerequisites: () =>
      ui.confirmAction({
        title: "Maintenance prerequisites",
        message: "Apply the required settings and continue?",
        actions: ["apply", "cancel"] as const,
        defaultAction: "cancel",
      }),
  };
}

const confirmPrerequisites = vi.fn<MaintenancePrompts["confirmPrerequisites"]>();
confirmPrerequisites.mockResolvedValueOnce("apply");
```

The `confirmAction` call itself infers `"apply" | "cancel" | null` from its literal actions. The consumer-owned interface makes that policy explicit for collaborators and test doubles. Keep the generic harness for interaction sequencing and runtime membership checks; use a narrow domain contract when the business operation, rather than the UI mechanism, is what a unit test needs to spy on.

## Understanding `kind` and `interactionId`

Each scripted step declares the technical interaction category in `kind`. The driver consumes steps in FIFO order and compares that category with the next request made by the workflow. For example, this script expects a text prompt followed by a confirmation:

```ts
const harness = createUiTestHarness([
  { kind: "promptText", value: "device-a" },
  { kind: "confirmAction", value: "save" },
]);
```

If the workflow requests `confirmAction` first, the driver fails with `Expected UI interaction promptText, received confirmAction`. This verifies the interaction sequence as well as the returned values.

The optional `interactionId` identifies the application-level purpose of a request. Use a stable identifier such as `device-name` or `restore-files`, independent of translated titles and labels:

```ts
const step = {
  kind: "promptText",
  interactionId: "device-name",
  value: "laptop",
} as const;
```

Here, `promptText` describes how the application interacts with a user, while `device-name` describes why that particular interaction exists. The identifier distinguishes multiple requests with the same kind and makes a mismatch easier to diagnose.

`kind` also determines the callback request type and the statically accepted result:

| `kind` | Automated result | Additional runtime validation |
| --- | --- | --- |
| `promptText` | `string \| null` | The result is a string or dismissal. |
| `promptPassword` | `string \| null` | The result is a string or dismissal. |
| `pickOne` | selected value or `null` | A non-null result is the identical instance from `options.items`. |
| `confirmAction` | action string or `null` | A non-null result is present in `options.actions`. |
| `showMessage` | no result | The result is `undefined`. |

TypeScript can infer a request from its declared kind, but a scripted step is created before the workflow supplies the actual selection items or action literals. Identity for `pickOne` and membership for `confirmAction` therefore remain runtime checks. Runtime validation also protects JavaScript consumers and dynamically assembled scripts.

A handled prompt, selection, or confirmation requires `value`. A message may omit it because acknowledgement has no result. A step with `passthrough: true` must omit `value`: it verifies and records the request, then delegates the response to the platform UI.

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

The callback request is inferred from `kind`; in this example it is a `promptText` request, so `options` is available without a manual narrowing check. TypeScript also checks the callback result and direct `value` against that interaction kind. A passed-through step cannot provide a value, and handled prompts, selections, and confirmations require one.

Automated values are also validated at runtime by the neutral interaction dispatcher:

- prompt responses must be a string or `null`;
- selection responses must be `null` or one of the supplied item instances;
- confirmation responses must be `null` or one of the supplied actions.

Runtime validation protects JavaScript consumers, dynamically assembled scripts, and other boundaries that may bypass static types. Together, the checks prevent a scripted test from succeeding with a response the real UI could never produce.

## Passthrough

A step with `passthrough: true` records and validates the interaction, then opens the real UI. A non-strict driver also passes through interactions after its queue is empty. Prefer strict mode for deterministic automated tests.

## What not to do

- Do not assign a driver to a modal static property.
- Do not keep one scripted driver in a module singleton.
- Do not enable scripted responses from settings, URI parameters, or other production input.
- Do not use scripted responses to claim real UI coverage.

Use `createUiTestHarness` for App-free application-flow tests. Use `createObsidianUi` for mixed tests that may pass through to Obsidian, and use the showcase E2E suite for keyboard, focus, rendering, theme, Modal, SuggestModal, and Notice behaviour in real Obsidian.
