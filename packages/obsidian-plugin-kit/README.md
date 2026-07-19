# @vrtmrz/obsidian-plugin-kit

Reusable, testable primitives for Obsidian plug-ins.

> [!IMPORTANT]
> This package is in initial `0.x` development. npm's normal compatible range accepts patch releases but not the next minor release. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly.

```bash
npm install @vrtmrz/obsidian-plugin-kit
```

The package is ESM and declares `obsidian >=1.8.7` as a peer dependency. The `dialog`, `notice`, `progress`, `ui`, and `vault` runtime entry points use Obsidian or DOM APIs and belong inside an Obsidian plug-in. The `testing` entry point is App-free and is intended for application-flow tests that do not need Obsidian rendering or Vault integration.

Start with the [usage guide](docs/usage-guide.md) for integration choices, complete examples, test harnesses, lifecycle guidance, platform boundaries, and links to the tests that establish each documented contract. See [UI automation and scripted responses](docs/ui-automation.md) for the detailed driver rules.

The UI, Vault, and testing boundaries are also used in maintained plug-ins. See [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md) for TagFolder, DiffZip, and Screwdriver examples and the verification level behind each one.

## Available modules

- `@vrtmrz/obsidian-plugin-kit`: convenience export of the runtime features below.
- `@vrtmrz/obsidian-plugin-kit/dialog`: text and password prompts, typed selection, confirmation, and message dialogs.
- `@vrtmrz/obsidian-plugin-kit/notice`: instance-scoped keyed Notice updates and lifecycle ownership.
- `@vrtmrz/obsidian-plugin-kit/progress`: embeddable progress fragments and progress Notices.
- `@vrtmrz/obsidian-plugin-kit/ui`: an Obsidian adapter for the neutral `UiInteractions` contract.
- `@vrtmrz/obsidian-plugin-kit/vault`: path-based text and frontmatter Vault capabilities with Obsidian adapters.
- `@vrtmrz/obsidian-plugin-kit/testing`: framework-neutral scripted UI drivers plus App-free UI, Vault text, and frontmatter harnesses.

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

The direct dialogue helpers accept an optional `AbortSignal` lifecycle argument. Bind it to the owning plug-in when a dialogue may remain open across asynchronous work; aborting closes the dialogue and resolves it as dismissal. See the [usage guide](docs/usage-guide.md#dialogs) for an example.

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

Frontmatter workflows can accept `VaultFrontmatterAccess` and remain independent of `TFile` identity:

```ts
import { createObsidianVaultFrontmatterAccess } from "@vrtmrz/obsidian-plugin-kit/vault";

const frontmatter = createObsidianVaultFrontmatterAccess(this.app);
await frontmatter.updateFrontmatter("Notes/example.md", (value) => {
  value.reviewed = true;
});
```

`createVaultFrontmatterTestHarness` provides transactional in-memory updates, before/after transcripts, stable missing and unsupported-file errors, failure injection, and rollback. It tests mutation policy rather than YAML serialisation; use real Obsidian when formatting, MetadataCache timing, or Vault events matter.
