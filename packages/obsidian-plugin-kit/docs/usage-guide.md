# Usage guide

This guide describes how to use `@vrtmrz/obsidian-plugin-kit` in an Obsidian plug-in, how to keep application workflows testable, and when to use the direct helpers instead of an injected capability.

The package is in initial `0.x` development. Install the stable release and pin its exact version when controlled upgrades are important:

```bash
npm install --save-exact @vrtmrz/obsidian-plugin-kit
```

`obsidian` is a peer dependency. A normal Obsidian plug-in project should already provide it as a development dependency.

## Choose an integration style

| Need | Recommended API |
| --- | --- |
| Open one dialog from Obsidian-specific leaf code | Import a function from `@vrtmrz/obsidian-plugin-kit/dialog` |
| Keep an application workflow independent of Obsidian UI classes | Accept `UiInteractions` and create it with `createObsidianUi` |
| Test that workflow without Obsidian | Use `createUiTestHarness` |
| Observe selected interactions while allowing others to open real UI | Pass an instance-scoped driver to `createObsidianUi` |
| Read and write text through a focused, injectable Vault boundary | Accept `VaultTextAccess` and create it with `createObsidianVaultTextAccess` |
| Test a Vault text workflow without Obsidian | Use `createVaultTextTestHarness` |
| Update one persistent Notice by an application-defined key | Use `KeyedNoticeManager` |
| Display determinate or indeterminate progress | Use `ProgressFragment` or `showProgressNotice` |

Direct dialog functions and `createObsidianUi` render the same Obsidian UI. The distinction is architectural: direct functions are convenient at an Obsidian-specific boundary, while `UiInteractions` allows a workflow to receive a neutral capability that a test can replace.

## Compose capabilities at the plug-in boundary

Create Obsidian adapters once per plug-in instance, then pass only the capabilities that each workflow needs:

```ts
import { Plugin } from "obsidian";
import { KeyedNoticeManager } from "@vrtmrz/obsidian-plugin-kit/notice";
import {
  createObsidianUi,
  type UiInteractions,
} from "@vrtmrz/obsidian-plugin-kit/ui";
import {
  createObsidianVaultTextAccess,
  type VaultTextAccess,
} from "@vrtmrz/obsidian-plugin-kit/vault";

interface WorkflowServices {
  ui: UiInteractions;
  vault: VaultTextAccess;
}

async function updateTemplate({ ui, vault }: WorkflowServices): Promise<void> {
  const name = await ui.promptText(
    { title: "Template name", initialValue: "Daily note" },
    "template-name",
  );
  if (name === null) return;

  await vault.modifyText("Templates/daily.md", `# ${name}\n`);
  await ui.showMessage(
    { title: "Template updated", message: "The template has been saved." },
    "template-updated",
  );
}

export default class ExamplePlugin extends Plugin {
  private readonly notices = new KeyedNoticeManager();

  override async onload(): Promise<void> {
    const services: WorkflowServices = {
      ui: createObsidianUi(this.app),
      vault: createObsidianVaultTextAccess(this.app.vault),
    };

    this.addCommand({
      id: "update-template",
      name: "Update template",
      callback: () => void updateTemplate(services),
    });
  }

  override onunload(): void {
    this.notices.dispose();
  }
}
```

The plug-in owns the concrete Obsidian objects and their lifecycle. The workflow sees path-based Vault operations and application-level UI interactions rather than `App`, `Modal`, `TFile`, or `Notice`.

## Dialogs

### Direct Obsidian helpers

Use the direct helpers when the calling code is already an Obsidian UI boundary:

```ts
import {
  confirmAction,
  pickOne,
  promptPassword,
  promptText,
  showMessage,
} from "@vrtmrz/obsidian-plugin-kit/dialog";

const deviceName = await promptText(app, {
  title: "Device name",
  initialValue: "desktop",
  selectInitialValue: true,
});

const password = await promptPassword(app, {
  title: "Encryption password",
});

const target = await pickOne(app, {
  items: files,
  getText: (file) => file.path,
  getDescription: (file) => `${file.stat.size} bytes`,
  placeholder: "Select a file",
});

const action = await confirmAction(app, {
  title: "Restore confirmation",
  message: "Restore the selected files?",
  actions: ["restore", "cancel"] as const,
  labels: { restore: "Restore", cancel: "Cancel" },
  defaultAction: "cancel",
});

await showMessage(app, {
  title: "Restore complete",
  message: "The selected files have been restored.",
});
```

`confirmAction` and `showMessage` render their message as Markdown. Use `sourcePath` when relative Markdown links need an Obsidian source path.

Dismissal resolves to `null` for prompts, selection, and confirmation. An explicitly submitted empty string remains `""`. `pickOne` returns the original supplied item, preserving object identity. Its secondary description is visible but is not included in fuzzy-search matching.

### Injected interactions

Application-flow code should accept `UiInteractions` rather than importing an Obsidian dialog directly:

```ts
import type { UiInteractions } from "@vrtmrz/obsidian-plugin-kit/ui";

export async function confirmRestore(ui: UiInteractions): Promise<boolean> {
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
```

The optional `interactionId` is a stable, machine-readable identifier for tests and diagnostics. Keep it independent of translated labels. Treat both `null` and an explicit cancellation action as cancellation where the workflow offers both paths.

## UI tests and spies

### App-free workflow tests

`createUiTestHarness` provides `UiInteractions`, a strict FIFO scripted driver, and a transcript without constructing an Obsidian `App`:

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

A scripted value may be a function of the observed request:

```ts
import type { UiInteractionRequest } from "@vrtmrz/obsidian-plugin-kit/ui";

const harness = createUiTestHarness([
  {
    kind: "promptText",
    value: (request: UiInteractionRequest) => {
      if (request.kind !== "promptText") throw new Error("Unexpected interaction");
      expect(request.options.title).toBe("Device name");
      return "observed-device";
    },
  },
]);
```

Automated values are validated against the real interaction contract. For example, `pickOne` accepts only `null` or one of the supplied item instances. Call `assertDone()` to detect expected interactions that the workflow never requested.

### Mixed tests with real Obsidian fallback

For a test running inside Obsidian, attach a driver to one adapter instance:

```ts
import { createScriptedUiDriver } from "@vrtmrz/obsidian-plugin-kit/testing";
import { createObsidianUi } from "@vrtmrz/obsidian-plugin-kit/ui";

const driver = createScriptedUiDriver([
  { kind: "promptText", interactionId: "device-name", value: "laptop" },
  { kind: "showMessage", interactionId: "review-result", passthrough: true },
]);

const ui = createObsidianUi(app, { driver });
```

The first request receives its scripted result. The second is recorded, then passed to the real Obsidian UI. A non-strict driver also passes requests through after its queue is empty, but strict mode is preferable for deterministic automation.

Drivers and response queues must remain instance-scoped. Do not store them in modal static members, module globals, settings, or URI-controlled production state. See [UI automation and scripted responses](ui-automation.md) for the detailed driver contract.

## Vault text workflows

`VaultTextAccess` deliberately exposes a small, path-based contract:

```ts
interface VaultTextAccess {
  readText(path: string): Promise<string>;
  createText(path: string, content: string): Promise<void>;
  modifyText(path: string, content: string): Promise<void>;
  appendText(path: string, content: string): Promise<void>;
}
```

Create the Obsidian adapter at the plug-in boundary:

```ts
import { createObsidianVaultTextAccess } from "@vrtmrz/obsidian-plugin-kit/vault";

const vault = createObsidianVaultTextAccess(app.vault);
await vault.modifyText("Notes/example.md", "Updated");
```

Test the same workflow with an isolated in-memory Vault:

```ts
import { createVaultTextTestHarness } from "@vrtmrz/obsidian-plugin-kit/testing";

const harness = createVaultTextTestHarness({
  files: { "Templates/note.md": "# {{title}}" },
});

await applyTemplate(harness.vault);

expect(harness.transcript).toEqual([
  { kind: "readText", path: "Templates/note.md" },
  { kind: "createText", path: "Notes/new.md", content: "# New" },
]);
expect(harness.getFile("Notes/new.md")).toBe("# New");
```

Use `onOperation` to inject a read or write failure. Missing reads, modifies, and appends reject with `VaultTextFileNotFoundError`; creating an existing path rejects with `VaultTextFileExistsError`.

This contract does not cover deletion, rename, binary files, folders, MetadataCache, events, or `TFile` lifecycle. Keep those behaviours in the consumer and test them in real Obsidian until a focused shared contract has proven consumers.

## Keyed Notices

`KeyedNoticeManager` owns at most one visible Notice per key. Reusing the key updates the existing Notice and restarts its expiry:

```ts
import { KeyedNoticeManager } from "@vrtmrz/obsidian-plugin-kit/notice";

const notices = new KeyedNoticeManager({ defaultDurationMs: 5_000 });

notices.show("sync", "Synchronising...", { durationMs: false });
notices.show("sync", "Synchronisation complete", { durationMs: 1_000 });

notices.hide("sync");
notices.dispose();
```

Use a separate manager for each owning application scope. `hideAll()` clears visible Notices while leaving the manager reusable. `dispose()` clears them and permanently ends the manager lifecycle, so call it during plug-in unload.

## Progress

Use `showProgressNotice` for progress displayed as an Obsidian Notice:

```ts
import { showProgressNotice } from "@vrtmrz/obsidian-plugin-kit/progress";

const progress = showProgressNotice({
  title: "Archiving files",
  total: files.length,
});

try {
  for (const file of files) {
    progress.update({ note: file.path });
    await archive(file);
    progress.increment();
  }
} catch (error) {
  progress.cancel("Archiving stopped");
  throw error;
}
```

A positive total completes automatically when the value reaches it. When the total is discovered or increased during the operation, set `autoComplete: false` and call `complete()` explicitly. A total of zero renders indeterminate progress.

Use `ProgressFragment` when embedding the same progress UI in a modal or view. Its `fragment` is appendable once, while `element` remains a stable reference. Completed and cancelled progress is terminal; later updates are ignored. Hide a still-visible `ProgressNotice` during plug-in unload.

## Imports and package boundaries

Prefer the focused public subpath that owns the feature:

```ts
import { promptText } from "@vrtmrz/obsidian-plugin-kit/dialog";
import { KeyedNoticeManager } from "@vrtmrz/obsidian-plugin-kit/notice";
import { showProgressNotice } from "@vrtmrz/obsidian-plugin-kit/progress";
import { createObsidianUi } from "@vrtmrz/obsidian-plugin-kit/ui";
import { createObsidianVaultTextAccess } from "@vrtmrz/obsidian-plugin-kit/vault";
import { createUiTestHarness } from "@vrtmrz/obsidian-plugin-kit/testing";
```

The root export exists for convenience, but focused imports make feature ownership and runtime dependencies clearer. Import only documented public entry points; do not import package `src` or `dist` internals.

`@vrtmrz/ui-interactions` is the framework-neutral contract package. Most Obsidian consumers can import its types and testing tools through `@vrtmrz/obsidian-plugin-kit`, while non-Obsidian consumers may depend on it directly.

## Select the appropriate test level

1. Use the App-free UI and Vault harnesses for application policy, cancellation, sequencing, failure injection, and transcripts.
2. Use a mixed driver with an Obsidian fallback only when a test must automate some interactions while leaving selected UI visible.
3. Use real-Obsidian E2E for rendering, keyboard and focus behaviour, themes, Modal and SuggestModal behaviour, Notice lifecycle, Vault events, MetadataCache propagation, and platform integration.

The repository's local real-application infrastructure is described in the [Obsidian test session guide](../../obsidian-test-session/README.md) and the [showcase E2E guide](../../../test/e2e-obsidian/README.md). It is not a substitute for consumer-specific assertions.
