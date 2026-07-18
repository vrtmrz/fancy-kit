# Usage and testing guide

`@vrtmrz/ui-interactions` separates an application's request for user interaction from the platform code that renders it. This guide describes the public contract, adapter composition, and deterministic test driver.

## Choose the smallest capability

`UiInteractions` contains five reusable interaction mechanisms:

| Method | Purpose |
| --- | --- |
| `promptText` | Request one unmasked line of text. |
| `promptPassword` | Request one visually masked line of text. |
| `pickOne` | Select one supplied typed item. |
| `confirmAction` | Select one literal action from a Markdown message. |
| `showMessage` | Show a Markdown message until it is acknowledged. |

Most workflows do not need the whole interface. Define a consumer-owned structural type with `Pick`:

```ts
import type { UiInteractions } from "@vrtmrz/ui-interactions";

type PublishUi = Pick<UiInteractions, "confirmAction" | "showMessage">;

export async function confirmPublish(ui: PublishUi): Promise<boolean> {
  const action = await ui.confirmAction(
    {
      title: "Publish package",
      message: "Publish the reviewed package?",
      actions: ["publish", "cancel"] as const,
      labels: { publish: "Publish", cancel: "Cancel" },
      defaultAction: "cancel",
    },
    "publish-package",
  );
  return action === "publish";
}
```

The literal action list makes the result `"publish" | "cancel" | null`. Keep application-specific names such as `PublishUi` in the consumer; the shared package describes interaction mechanisms rather than domain policy.

## Supply platform UI

A platform adapter implements `UiInteractions`. Create it at the application composition root, where browser, desktop, terminal, or framework services are already available.

Use the adapter directly when no driver is needed. Use `createDrivenUiInteractions` to consult an instance-scoped driver before falling back to the adapter:

```ts
import {
  createDrivenUiInteractions,
  type UiInteractionDriver,
  type UiInteractions,
} from "@vrtmrz/ui-interactions";

declare const platformUi: UiInteractions;
declare const driver: UiInteractionDriver | undefined;

const ui = createDrivenUiInteractions({ fallback: platformUi, driver });
await confirmPublish(ui);
```

When no driver is supplied, every request reaches `fallback`. A driver response with `{ handled: false }` also reaches `fallback`. If neither path handles a request, the returned promise rejects with a clear missing-fallback error.

`DrivenUiInteractions` validates handled values before returning them to the workflow:

- prompt values must be strings or `null`;
- a non-null selection must be the identical object contained in `options.items`;
- a non-null action must occur in `options.actions`; and
- an acknowledged message must not return a value.

These checks keep scripted and other automated adapters within the result space of a real platform adapter.

## Understand option contracts

### Prompts

`PromptTextOptions` supplies the title, optional label and description, initial value, placeholder, action labels, and initial-selection policy. The package does not prescribe how a platform masks passwords beyond the distinct `promptPassword` request.

Dismissal resolves to `null`. An explicitly submitted empty field resolves to `""`, so check `value === null` rather than using a truthiness test when an empty value is valid.

### Typed selection

`PickOneOptions<T>` receives the candidate items and a searchable text projection. `getDescription`, when supplied, is secondary visible text and does not form part of the shared search-matching contract.

The selected result preserves object identity:

```ts
import type { UiInteractions } from "@vrtmrz/ui-interactions";

async function chooseSecondary(
  ui: Pick<UiInteractions, "pickOne">,
): Promise<boolean> {
  const primary = { id: "primary", label: "Primary" };
  const secondary = { id: "secondary", label: "Secondary" };

  const selected = await ui.pickOne({
    items: [primary, secondary],
    getText: (item) => item.label,
  });

  return selected === secondary;
}
```

### Markdown actions and messages

`confirmAction` receives one or more typed action identifiers. Visible labels are separate from the identifiers, which lets tests and translated applications use stable machine-readable values. If both `defaultAction` and `timeoutMs` are supplied, the default action is selected when the timeout expires; without a default action, `timeoutMs` has no effect.

`confirmAction` and `showMessage` accept Markdown plus an optional logical `sourcePath` for platform adapters that resolve relative links. The shared package does not render or sanitise that Markdown itself; rendering policy belongs to the adapter.

## Script application-flow tests

`createUiTestHarness` combines a strict scripted driver with a driver-aware UI instance that deliberately has no platform fallback:

```ts
import { createUiTestHarness } from "@vrtmrz/ui-interactions/testing";

const harness = createUiTestHarness([
  {
    kind: "confirmAction",
    interactionId: "publish-package",
    value: (request) => {
      if (request.options.defaultAction !== "cancel") {
        throw new Error("The safe default was not offered");
      }
      return "publish";
    },
  },
]);

const accepted = await confirmPublish(harness.ui);
if (!accepted) throw new Error("Expected publication to be accepted");

harness.assertDone();
```

The `kind` field selects both the expected request variant and the accepted response type. The optional `interactionId` verifies the application-level purpose independently of visible titles and labels.

Every observed request is appended to `harness.transcript`, including a request that later fails validation or passes through. `assertDone()` detects scripted steps that the workflow never consumed.

### Strictness and pass-through

`ScriptedUiDriver` is strict by default. It rejects a request when the queue is empty, the next `kind` differs, or a supplied `interactionId` differs.

A step with `passthrough: true` verifies and records the request, then invokes the configured platform fallback. A non-strict driver also passes through requests after its queue is empty:

```ts
import { createScriptedUiDriver } from "@vrtmrz/ui-interactions/testing";

const driver = createScriptedUiDriver(
  [{ kind: "confirmAction", passthrough: true }],
  { strict: false },
);
```

Pass-through cannot succeed inside `createUiTestHarness`, because that App-free harness intentionally has no platform UI. Compose the driver with a real adapter through `createDrivenUiInteractions` for mixed tests.

## Keep state instance-scoped

Create a separate driver or harness for each test and application scope. Do not store response queues in static class members or module globals. Shared mutable queues make outcomes depend on test order and can leak responses between concurrent application instances.

Do not expose scripted responses through production settings, URLs, command-line values, or other untrusted input. A driver is an explicit test capability, not a production automation channel.

## Contract evidence and examples

The package documentation is backed by focused, non-platform tests and by its Obsidian consumer:

| Public contract | Evidence or example |
| --- | --- |
| FIFO scripts, callback typing, transcripts, strict completion, runtime result validation, and missing fallback | [`src/testing.test.ts`](../src/testing.test.ts) |
| Driver-aware dispatch and validation rules | [`src/driven-ui.ts`](../src/driven-ui.ts) |
| Complete option defaults and result types | [`src/contracts.ts`](../src/contracts.ts) |
| Real Obsidian adapter and mixed pass-through tests | [`../../obsidian-plugin-kit/src/ui-context.test.ts`](../../obsidian-plugin-kit/src/ui-context.test.ts) |
| Obsidian composition and App-free workflow examples | [`../../obsidian-plugin-kit/docs/usage-guide.md`](../../obsidian-plugin-kit/docs/usage-guide.md) |

These tests cover the neutral dispatcher and scripted harness. A platform adapter remains responsible for its own rendering, focus, keyboard, accessibility, and lifecycle tests.

The same boundary is used in maintained TagFolder, DiffZip, and Screwdriver workflows. Their source, App-free policy tests, and real-Obsidian checks are linked from [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md). These examples are evidence for the named interactions, not a claim that the neutral package itself owns Obsidian rendering.
