# @vrtmrz/obsidian-plugin-kit

Reusable, testable primitives for Obsidian plugins.

> [!NOTE]
> This package is under initial development and is not yet published.

## Available modules

- `@vrtmrz/obsidian-plugin-kit/dialog`: text and password prompts, typed selection, confirmation, and message dialogs.
- `@vrtmrz/obsidian-plugin-kit/notice`: instance-scoped keyed Notice updates and lifecycle ownership.
- `@vrtmrz/obsidian-plugin-kit/progress`: embeddable progress fragments and progress Notices.
- `@vrtmrz/obsidian-plugin-kit/ui`: an Obsidian adapter for the neutral `UiInteractions` contract.
- `@vrtmrz/obsidian-plugin-kit/vault`: a path-based text Vault capability and Obsidian adapter.
- `@vrtmrz/obsidian-plugin-kit/testing`: framework-neutral scripted UI drivers plus App-free UI and Vault harnesses.

## Dialogs

```ts
import {
  confirmAction,
  pickOne,
  promptText,
} from "@vrtmrz/obsidian-plugin-kit/dialog";

const name = await promptText(this.app, {
  title: "Device name",
  initialValue: "desktop",
});

const target = await pickOne(this.app, {
  items: files,
  getText: (file) => file.path,
  getDescription: (file) => `${file.stat.size} bytes`,
  placeholder: "Select a file",
});

const action = await confirmAction(this.app, {
  title: "Restore confirmation",
  message: "The selected files will be restored.",
  actions: ["restore", "cancel"] as const,
  defaultAction: "cancel",
});
```

Dismissal resolves to `null`. An explicitly submitted empty string remains `""` and is not treated as cancellation. `pickOne` returns the selected item instance rather than a copy. Its optional secondary description is visible but does not change fuzzy-search matching.

## Keyed notices

`KeyedNoticeManager` updates one visible Notice per application-defined key and restarts its expiry on every update. Dispose the manager during plug-in unload.

```ts
import { KeyedNoticeManager } from "@vrtmrz/obsidian-plugin-kit/notice";

const notices = new KeyedNoticeManager();
notices.show("sync", "Synchronising...");
notices.show("sync", "Synchronisation complete", { durationMs: 1_000 });

// In the owning plug-in's onunload():
notices.dispose();
```

## Progress

`ProgressFragment` can be embedded in a modal or view. `showProgressNotice` displays progress in an Obsidian Notice and hides it shortly after completion by default.

```ts
import { showProgressNotice } from "@vrtmrz/obsidian-plugin-kit/progress";

const progress = showProgressNotice({
  title: "Archiving files",
  total: files.length,
});

for (const file of files) {
  progress.update({ note: file.path });
  await archive(file);
  progress.increment();
}
```

For totals discovered during an operation, pass `autoComplete: false` and call `complete()` explicitly.

## Testable UI

`createObsidianUi` supplies the neutral `UiInteractions` capability with an optional test driver, without adding response queues to modal classes or global state. Top-level dialog functions always open real Obsidian UI.

```ts
import { createScriptedUiDriver } from "@vrtmrz/obsidian-plugin-kit/testing";
import { createObsidianUi } from "@vrtmrz/obsidian-plugin-kit/ui";

const driver = createScriptedUiDriver([
  { kind: "promptText", interactionId: "device-name", value: "laptop" },
]);
const ui = createObsidianUi(app, { driver });

await ui.promptText({ title: "Device name" }, "device-name");
driver.assertDone();
```

Application-flow tests that do not need Obsidian can use the App-free harness directly:

```ts
import { createUiTestHarness } from "@vrtmrz/obsidian-plugin-kit/testing";

const harness = createUiTestHarness([
  { kind: "confirmAction", value: "apply" },
]);

await harness.ui.confirmAction({
  title: "Apply changes",
  message: "Continue?",
  actions: ["apply", "cancel"] as const,
});
harness.assertDone();
```

See [UI automation and scripted responses](docs/ui-automation.md) for driver behaviour and guidance on choosing between scripted and real UI tests.

## Testable Vault workflows

`createObsidianVaultTextAccess` keeps application workflows independent of `TFile` identity while delegating completed text reads and writes to one Obsidian Vault instance:

```ts
import { createObsidianVaultTextAccess } from "@vrtmrz/obsidian-plugin-kit/vault";

const vault = createObsidianVaultTextAccess(this.app.vault);
await vault.modifyText("Notes/example.md", "Updated");
```

App-free tests can supply an isolated in-memory implementation and inspect its operation transcript and final state:

```ts
import { createVaultTextTestHarness } from "@vrtmrz/obsidian-plugin-kit/testing";

const harness = createVaultTextTestHarness({
  files: { "Templates/note.md": "# {{title}}" },
});

await applyTemplate(harness.vault);

expect(harness.transcript).toEqual([
  { kind: "readText", path: "Templates/note.md" },
  { kind: "modifyText", path: "Notes/new.md", content: "# New" },
]);
```

The capability deliberately excludes deletion, rename, binary files, MetadataCache, and `TFile` lifecycle. Keep those operations consumer-owned until another focused contract has real consumers. Use real-Obsidian E2E for event timing, metadata propagation, and platform behaviour.

## Development

From the workspace root:

```bash
npm run check:all
npm run test
npm run build
npm run build:showcase
```

Run `npm run verify:workspace` before handing off repository-wide changes.
