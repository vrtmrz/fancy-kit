# @vrtmrz/obsidian-plugin-kit

Reusable, testable primitives for Obsidian plug-ins.

> [!IMPORTANT]
> This package is in initial `0.x` development. npm's normal compatible range accepts patch releases but not the next minor release. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly.

```bash
npm install --save-exact @vrtmrz/obsidian-plugin-kit@0.1.5
```

The package is ESM and declares `obsidian >=1.8.7` as a peer dependency. The `dialog`, `notice`, `progress`, `ui`, and `vault` runtime entry points use Obsidian or DOM APIs and belong inside an Obsidian plug-in. The `testing` entry point is App-free and is intended for application-flow tests that do not need Obsidian rendering or Vault integration. The `secrets` entry adapts an injected SecretStorage capability and can be imported without Obsidian or DOM globals; the real host API requires Obsidian 1.11.4 or later. The `secrets` and `local-storage` entries are added in 0.1.5, which pins `@vrtmrz/secret-store@0.1.0` and `@vrtmrz/value-store@0.1.0`. The `local-storage` entry adapts the App `loadLocalStorage` and `saveLocalStorage` methods, documented since Obsidian 1.8.7, through the shared `@vrtmrz/value-store` core. The existing `obsidian >=1.8.7` peer requirement is unchanged.

Start with the [usage guide](docs/usage-guide.md) for integration choices, complete examples, test harnesses, lifecycle guidance, platform boundaries, and links to the tests that establish each documented contract. See [UI automation and scripted responses](docs/ui-automation.md) for the detailed driver rules.

The UI, Vault, and testing boundaries are also used in maintained plug-ins. See [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md) for TagFolder, DiffZip, and Screwdriver examples and the verification level behind each one.

## Available modules

- `@vrtmrz/obsidian-plugin-kit`: convenience export of the runtime features below.
- `@vrtmrz/obsidian-plugin-kit/dialog`: text and password prompts, typed selection, confirmation, and message dialogs.
- `@vrtmrz/obsidian-plugin-kit/notice`: instance-scoped keyed Notice updates, the neutral `UiNotifications` adapter, and lifecycle ownership.
- `@vrtmrz/obsidian-plugin-kit/progress`: embeddable progress fragments and progress Notices.
- `@vrtmrz/obsidian-plugin-kit/ui`: an Obsidian adapter for the neutral `UiInteractions` contract.
- `@vrtmrz/obsidian-plugin-kit/vault`: path-based text and frontmatter Vault capabilities with Obsidian adapters.
- `@vrtmrz/obsidian-plugin-kit/secrets`: injected named-secret reading and replacement writes through Obsidian SecretStorage.
- `@vrtmrz/obsidian-plugin-kit/local-storage`: asynchronous string and JSON-object storage through the official App methods, with an optional serializer and construction-time legacy Web Storage selector.
- `@vrtmrz/obsidian-plugin-kit/testing`: framework-neutral scripted UI drivers plus App-free UI, Vault text, and frontmatter harnesses.

## Secret storage

```ts
import { createObsidianSecretStore } from "@vrtmrz/obsidian-plugin-kit/secrets";

const secrets = createObsidianSecretStore(this.app.secretStorage);
const token = await secrets.getValue("example-api-token");
if (token === null) {
  // The application decides how to handle an absent credential.
}
```

Construct the adapter once at the plug-in boundary and pass a `SecretReader` or `SecretStore` from `@vrtmrz/secret-store` to application code. Missing host methods produce `unavailable` at construction. Operations reject with sanitised errors, preserve empty values, and never switch to another store. The optional `ValueSerializer` pair can be supplied when constructing the adapter; it is instance-scoped and remains separate from any backend encryption. Obsidian owns persistence and namespace sharing; this adapter does not isolate secrets between plug-ins or synchronise them between devices. See [secret storage](docs/usage-guide.md#secret-storage) for value compatibility, testing, and failure behaviour.

## Local string and JSON-object storage

The `local-storage` entry adapts Obsidian's synchronous local-storage API behind the shared asynchronous `ValueStore` operations and explicit `ValueDeleter` capability. Obsidian owns the Vault scope; the application supplies a literal prefix for its plug-in:

```ts
import type { App } from "obsidian";
import { createObsidianLocalStore } from "@vrtmrz/obsidian-plugin-kit/local-storage";
import type { ValueDeleter, ValueStore } from "@vrtmrz/value-store";

export function createSettings(app: App): ValueStore & ValueDeleter {
  return createObsidianLocalStore(app, { prefix: "example-plugin:settings:" });
}

export async function savePreferences(settings: ValueStore & ValueDeleter): Promise<void> {
  await settings.setValue("device-label", "laptop");
  await settings.setObject("preferences", {
    theme: "dark",
    shortcuts: { showHints: false, retries: 0 },
  });
}
```

The focused adapter uses `App.loadLocalStorage` and `App.saveLocalStorage` directly. It stores `setValue` strings raw and object values as JSON text; it adds no envelope, read-back, or probe write, and imports no Obsidian runtime globals. Empty `setValue` is ordinary data in ValueStore, but Obsidian treats a raw empty physical write as deletion, so this adapter rejects an empty physical output with `invalid-value` before the host call. Use `delete` for explicit deletion; the adapter maps it to `saveLocalStorage(key, null)`. A serializer can preserve a logical empty string only if it produces a non-empty physical output. `setObject` preserves top-level `null`, empty strings, zero, negative zero, and `false` as JSON data. A missing object is `undefined`, while stored JSON `null` is `null`. Obsidian 1.13.6 was observed to suppress some internal storage failures, so an apparent miss may also be a hidden read failure, and a write acknowledgement cannot prove persistence. The reviewed Obsidian 1.13.6 scenario passed with the ValueStore semantics, covering empty-write rejection before mutation, explicit deletion, restart, prefix separation, and explicitly selected legacy Web Storage. See the [validation evidence](../../docs/proven-in-use.md#valuestore-package-owned-evidence) for the qualified environment.

For an explicitly selected legacy Web Storage source, supply its complete old prefix, including the application's Vault and plug-in scope:

```ts
import { createWebStorageValueStore } from "@vrtmrz/value-store/web-storage";

const legacySettings = createWebStorageValueStore(window.localStorage, {
  prefix: "my-vault::example-plugin::settings:",
});
```

The optional compatibility selector uses the official methods when both are present. Only when both are absent does it evaluate the lazy legacy source, once:

```ts
import { createCompatibleObsidianLocalStore } from "@vrtmrz/obsidian-plugin-kit/local-storage";

const settings = createCompatibleObsidianLocalStore(app, {
  prefix: "example-plugin:settings:",
  legacy: () => ({
    storage: window.localStorage,
    prefix: "my-vault::example-plugin::settings:",
  }),
});
```

A partial official API fails rather than falling back. An absent key or operation error on the selected source never switches stores, and neither factory migrates values. Keep any key-by-key migration in application code. The compatibility path cannot restore an old Web Storage source that the host no longer exposes unless the application has another explicit source.

The shared contracts and adapter exports, including `./web-storage` and `./node-json-file`, are documented in the [ValueStore package README](../value-store/README.md). Fancy Kit's existing IndexedDB `KeyValueStore` family and `PersistentMap` are separate APIs and remain unchanged. Use the [usage guide](docs/usage-guide.md#local-json-value-storage) for failure behaviour and test examples.

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

`confirmAction` constrains long Markdown content to the effective top and bottom safe-area insets, keeps its action area available, and lets the message scroll inside the dialogue. Use `actionLayout: "vertical"` for several long or safety-sensitive actions on narrow screens.

## Keyed notices

Use `createObsidianUiNotifications` when a workflow accepts the neutral `UiNotifications` capability. It supports plain-text keyed messages and one optional action without exposing an Obsidian `Notice` or DOM element:

```ts
import { createObsidianUiNotifications } from "@vrtmrz/obsidian-plugin-kit/notice";

const notifications = createObsidianUiNotifications();
notifications.show("conflict", {
  message: "A conflict needs review.",
  action: { label: "Review", onSelect: () => void reviewConflicts() },
  durationMs: false,
});

// In the owning plug-in's onunload():
notifications.dispose();
```

`KeyedNoticeManager` updates one visible Notice per application-defined key and restarts its expiry on every update. After click dismissal, the next update creates a fresh Notice rather than reviving the acknowledged one. The manager retains its own message root and does not read `Notice.messageEl` or deprecated `Notice.noticeEl`. Dispose the manager during plug-in unload.

```ts
import { KeyedNoticeManager } from "@vrtmrz/obsidian-plugin-kit/notice";

const notices = new KeyedNoticeManager();
notices.show("sync", "Synchronising...");
notices.show("sync", "Synchronisation complete", { durationMs: 1_000 });

// In the owning plug-in's onunload():
notices.dispose();
```

`KeyedNoticeGroupManager` keeps several named rows in one Notice. Updating an item key replaces that row without changing its position; adding another key creates a separated row. Active groups remain visible until `finish()` starts their expiry.

Click dismissal starts a fresh group on the next update, even while Obsidian's hide transition still has the old Notice connected. Previously acknowledged rows are not reintroduced.

```ts
import { KeyedNoticeGroupManager } from "@vrtmrz/obsidian-plugin-kit/notice";

const notices = new KeyedNoticeGroupManager();
notices.setItem("integrity", "checking", {
  message: "Checking for incomplete documents...",
});
notices.setItem("integrity", "result", {
  message: "No size mismatches found",
});
notices.finish("integrity");

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
