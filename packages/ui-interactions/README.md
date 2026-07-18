# @vrtmrz/ui-interactions

Framework-neutral contracts for application-level prompts, typed selection, Markdown actions, and messages. The package also provides instance-scoped drivers for deterministic tests.

It contains no Obsidian or DOM adapter. A consumer supplies the platform UI, while application workflows depend only on `UiInteractions` or a narrower structural type.

> [!IMPORTANT]
> This package is in initial `0.x` development. npm's normal compatible range accepts patch releases but not the next minor release. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly.

```bash
npm install @vrtmrz/ui-interactions
```

The package is ESM and has no runtime dependencies.

The contract and testing driver are used through the Obsidian adapter in maintained TagFolder, DiffZip, and Screwdriver workflows. See [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md) for the source and verification boundary of each example.

## Public entry points

| Entry point | Purpose |
| --- | --- |
| `@vrtmrz/ui-interactions` | `UiInteractions`, option and request types, `DrivenUiInteractions`, and `createDrivenUiInteractions` |
| `@vrtmrz/ui-interactions/testing` | `ScriptedUiDriver`, `createScriptedUiDriver`, and the App-free `createUiTestHarness` |

Import only these public entry points, not package `src` or `dist` files.

## Define a narrow workflow boundary

Use `Pick` when a workflow needs only part of the shared contract:

```ts
import type { UiInteractions } from "@vrtmrz/ui-interactions";

type RenameDeviceUi = Pick<UiInteractions, "promptText" | "showMessage">;

export async function renameDevice(ui: RenameDeviceUi): Promise<string | null> {
  const name = await ui.promptText(
    { title: "Device name", initialValue: "desktop" },
    "device-name",
  );
  if (name === null) return null;

  await ui.showMessage(
    { title: "Device renamed", message: `The new name is **${name}**.` },
    "device-renamed",
  );
  return name;
}
```

Create the real platform adapter at the application boundary, then pass it to the workflow. `createDrivenUiInteractions({ fallback })` can place an optional driver in front of any complete `UiInteractions` implementation.

## Test without platform UI

```ts
import { createUiTestHarness } from "@vrtmrz/ui-interactions/testing";

const harness = createUiTestHarness([
  { kind: "promptText", interactionId: "device-name", value: "laptop" },
  { kind: "showMessage", interactionId: "device-renamed" },
]);

await renameDevice(harness.ui);
harness.assertDone();
```

The scripted driver is FIFO and strict by default. Each harness owns its queue and transcript; there is no global response state. A response callback can inspect the kind-specific request before returning its value.

## Interaction contracts

| Method | Successful result | Dismissal |
| --- | --- | --- |
| `promptText` and `promptPassword` | Submitted string, including `""` | `null` |
| `pickOne` | The identical selected object from `items` | `null` |
| `confirmAction` | One literal identifier from `actions` | `null` |
| `showMessage` | `void`, after acknowledgement | Not applicable |

Automated responses are checked against these same contracts. `interactionId` is optional, but a stable identifier makes repeated interaction kinds easier to distinguish in tests and diagnostics.

For adapter composition, driver pass-through, callback typing, and the test evidence behind these contracts, see the [usage and testing guide](https://github.com/vrtmrz/fancy-kit/blob/main/packages/ui-interactions/docs/usage-guide.md).
