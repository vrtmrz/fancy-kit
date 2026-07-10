# @vrtmrz/obsidian-plugin-kit

Reusable, testable primitives for Obsidian plugins.

> [!NOTE]
> This package is under initial development and is not yet published.

## Available modules

- `@vrtmrz/obsidian-plugin-kit/dialog`: text and password prompts, typed selection, confirmation, and message dialogs.
- `@vrtmrz/obsidian-plugin-kit/notice`: instance-scoped keyed Notice updates and lifecycle ownership.
- `@vrtmrz/obsidian-plugin-kit/progress`: embeddable progress fragments and progress Notices.
- `@vrtmrz/obsidian-plugin-kit/ui`: an instance-scoped UI context for application code.
- `@vrtmrz/obsidian-plugin-kit/testing`: a strict scripted driver for unit and integration tests.

## Dialogs

```ts
import { confirmAction, pickOne, promptText } from "@vrtmrz/obsidian-plugin-kit/dialog";

const name = await promptText(this.app, {
  title: "Device name",
  initialValue: "desktop",
});

const target = await pickOne(this.app, {
  items: files,
  getText: (file) => file.path,
  placeholder: "Select a file",
});

const action = await confirmAction(this.app, {
  title: "Restore confirmation",
  message: "The selected files will be restored.",
  actions: ["restore", "cancel"] as const,
  defaultAction: "cancel",
});
```

Dismissal resolves to `null`. An explicitly submitted empty string remains `""` and is not treated as cancellation. `pickOne` returns the selected item instance rather than a copy.

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

`UiContext` lets application code use a test driver without adding response queues to modal classes or global state. Top-level dialog functions always open real Obsidian UI.

```ts
import { createScriptedUiDriver } from "@vrtmrz/obsidian-plugin-kit/testing";
import { createUiContext } from "@vrtmrz/obsidian-plugin-kit/ui";

const driver = createScriptedUiDriver([
  { kind: "promptText", interactionId: "device-name", value: "laptop" },
]);
const ui = createUiContext(app, { driver });

await ui.promptText({ title: "Device name" }, "device-name");
driver.assertDone();
```

See [UI automation and scripted responses](docs/ui-automation.md) for driver behaviour and guidance on choosing between scripted and real UI tests.

## Development

```bash
npm run check:all
npm run test
npm run build
npm run build:showcase
```
