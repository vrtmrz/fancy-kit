# Fancy Kit consumer cheat sheet

Start with the operation you need, then choose its lifetime and runtime adapter. Pass the smallest capability to shared code; construct concrete adapters where the application already has its browser, Obsidian, database, or filesystem services.

The [API catalogue](API-CATALOGUE.md) lists public entry points and methods. Follow the linked package guides for signatures and complete contracts. These pages describe the source in this checkout; the [installation guidance](README.md#installation) explains package selection and release availability.

[Cleanup and concurrency](#cleanup-and-concurrency) · [Small helpers](#standard-operations-and-small-helpers) · [UI](#interaction-and-notification) · [Storage](#state-and-storage) · [Testing](#test-at-the-boundary-you-own) · [Specialised coordination](#specialised-and-existing-coordination-apis)

## Choose a package

| Need | Start here |
| --- | --- |
| Cleanup, cancellation, concurrency, iteration, conversion, caches, or generic algorithms | [`octagonal-wheels`](#cleanup-and-concurrency) |
| Ask for input without depending on a UI platform | [`@vrtmrz/ui-interactions`](#interaction-and-notification) |
| Render interactions or notifications in a browser | `@vrtmrz/browser-ui-kit` |
| Obsidian dialogues, notices, commands, or injectable Vault access | `@vrtmrz/obsidian-plugin-kit` |
| Read and replace ordinary strings or JSON values through an injected backend | [`@vrtmrz/value-store`](#state-and-storage) |
| Read or replace named secrets through an explicitly selected backend | `@vrtmrz/secret-store` |
| Store age-encrypted secrets in an explicitly supplied Node.js directory | `@vrtmrz/secret-store-node/age`; see its [development-package status](packages/secret-store-node/README.md) |
| Launch an isolated real Obsidian session for a consumer test | [`@vrtmrz/obsidian-test-session`](#test-at-the-boundary-you-own), as a development dependency |

## Cleanup and concurrency

All imports in this section start with `octagonal-wheels/`. Scope helpers work with structural capabilities and closures; they do not require an application base class or service container.

| When you need to… | Use | Contract to preserve |
| --- | --- | --- |
| Own one already acquired value and its release | `createOwnedResource`, `withOwnedResource` from `resource` | One release. The callback wrapper uses `finally` semantics: a release failure can replace the body failure. |
| Acquire resources during an operation and release them when it settles | `withScope` from `resource/scope`; `ctx.defer` | Cleanup runs once in reverse registration order and is awaited. All cleanup is attempted; multiple failures become `AggregateError`. The supplied `value` is borrowed. |
| Reuse a sequence of scoped steps | `scoped().pipe()` from `resource/scope` | Ordinary steps share the enclosing cleanup owner. Composition starts no work. |
| Release a step's resources before the next step starts | `scoped().pipeScoped()` | Its child scope closes before passing the result onward. Return detached results when cleanup invalidates an acquired resource. |
| Observe caller cancellation and own its listener lifetime | `withCancellation` from `concurrency/cancellation` | Work still runs if the signal is already aborted. Cancellation is cooperative and does not itself reject or replace the result. |
| Process items with per-item cleanup and bounded concurrency | `forEachInScope`, `mapInScope` from `concurrency/scoped.iteration` | Await the returned promise inside the parent scope. Started work, item cleanup, and iterator cleanup finish before settlement. Cancellation stops admission. |
| Share a capacity limit across independent operations | `Semaphore`, `withSemaphore`, `acquirePermit` from `concurrency/semaphore` | `withSemaphore` owns one callback's permit with `finally` release semantics; `acquirePermit` registers release in a scope. Permit acquisition is not automatically cancelled by a scope signal. |
| Serialise access by key | `withLock`, `withLocks` from `concurrency/lock` | Use distinct keys and one consistent ordering for multiple locks. Reacquiring a held key can deadlock. |
| Share one in-flight result for the same operation key | `shareRunningResult` from `concurrency/lock` | The key defines which work is equivalent. This is not a persistent result cache. |
| Keep only the latest pending delayed action | `createDeferredAction` from `concurrency/deferredAction` | `cancel` permits later scheduling; `dispose` is terminal. Neither stops an already started callback, whose result is not awaited. |
| Bound concurrent mapping and stream results | `asyncMapWithConcurrency`, `withConcurrency` from `iterable/map` | Positive concurrency; the former yields input order; the latter does not guarantee order. Choose scoped iteration when failure must drain work and cleanup. |
| Connect a producer to one asynchronous iterator | `createAsyncQueue` from `iterable/asyncQueue` | `finish` drains queued items; `dispose` discards unread items. No capacity limit or backpressure. |
| Wake current waiters without a payload | `createNotifier` from `concurrency/notifier` | Notifications are not retained for future waiters. |
| Coalesce progress notifications by count or elapsed time | `createCoalescingNotifier` from `concurrency/coalescingNotifier` | `flush` delivers the pending final value; call it before disposal when that value matters. |

For example, each reader below belongs to one item; the function waits for all admitted readers to close:

```ts
import { withCancellation } from "octagonal-wheels/concurrency/cancellation";
import { mapInScope } from "octagonal-wheels/concurrency/scoped.iteration";

interface Reader {
  read(): Promise<string>;
  close(): Promise<void>;
}

async function readPaths(
  paths: readonly string[],
  openReader: (path: string) => Promise<Reader>,
  signal?: AbortSignal,
) {
  return withCancellation(paths, { signal }, (scope) =>
    mapInScope(scope, scope.value, { concurrency: 4 }, async (path, item) => {
      const reader = await openReader(path);
      item.defer(() => reader.close());
      return reader.read();
    }),
  );
}
```

The result distinguishes `completed` from `cancelled`; cancelled results contain the values of started callbacks in input order. A callback failure still rejects after drainage. The reader in this example has no abort capability, so cancellation only stops new admission.

See [execution scopes](packages/octagonal-wheels/guides/execution-scopes.md), [ownership and runtime composition](docs/runtime-composition.md), and [import and runtime boundaries](packages/octagonal-wheels/guides/imports-and-runtime.md).

## Standard operations and small helpers

Choose a helper for the extra contract it provides. Plain synchronous array operations, an ordinary `Map`, and a local `try`/`finally` remain useful when they already express the required behaviour.

| Situation | OW entry and API | Selection rule |
| --- | --- | --- |
| Filter using an asynchronous predicate | `iterable/map`: `filter` | Awaits each predicate and returns an async iterable. An async predicate passed to `Array.filter` returns truthy promises. |
| Split an iterable into bounded chunks | `iterable/chunks`: `asChunk`, `asFlat` | Consume chunks incrementally, or flatten them back into items. Array helpers suit an already materialised array. |
| Preserve JSON serialisation constraints, for example around an RPC payload | `encoding/json`: `cloneViaJSON` | JSON round-trip semantics, including throwing on circular references. This is a useful constraint at a JSON boundary; it is not a general replacement for `structuredClone` or a complete RPC schema validator. |
| Convert binary data, Base64, or Blob inputs | `binary` focused entries | Use the documented byte and chunk representations, including views with offsets. Choose `arrayBufferToBase64Single` when a single encoded string is required; inspect `arrayBufferToBase64`'s chunked result contract. |
| Normalise Blob inputs or obtain an `ArrayBuffer` from a view | `binary/blob`: `toBlob`, `createTextBlob`, `createBinaryBlob`; `binary/arrayBuffer`: `toArrayBuffer` | Preserve the visible byte range; `toBlob` preserves an existing Blob's identity. |
| Check portable relative paths | `path`: `parseSafeRelativePath`, `resolvePathWithinRoot` | Lexical path validation and containment do not establish filesystem permissions or symbolic-link containment. |
| Suppress consecutive duplicate calls | `function`: `onlyWhenChanged` | Compares one argument with the last value using `===`; an initial `undefined` is skipped. It is not a history-wide deduplication set. |
| Limit repeated calls over time | `function`: `throttle` | Check its timing and argument-selection contract; it is a different operation from replacing a pending deferred action. |
| Write content only when it differs from the stored content | `modification`: `createModificationHandler` | Inject read, read-error recovery, decode, comparison, and write. Only read failures enter recovery; no locking or retries are added. |
| Memoise a computation | `memory/memo`: `memoWithMap` | Its default key uses the first string argument. Supply a key function when other arguments affect the result. |
| Dispatch typed events and own subscriptions | `events`: `EventHub` | Use returned disposers or supported signals for listener lifetime. `hub.waitFor` is an instance method; its wait has no abort argument. Async listener results are not awaited. |
| Format a duration, size, or delimited list | `notation/duration`: `formatDuration`; `number`: `sizeToHumanReadable`; `string`: `splitDelimitedList`, `joinDelimitedList` | Reuse the existing representation and delimiter contract. |
| Support runtimes without native `Promise.withResolvers` | `promises`: `promiseWithResolvers` | Uses the native operation when present and a fallback otherwise. `promiseWithResolver` is the deprecated spelling. |
| Keep the screen awake during work | `browser/wakeLock`: `createScreenWakeLockManager` | `run` owns the callback's lease; an explicitly acquired lease needs disposal. Unsupported platforms remain best-effort. |
| Read or produce an established hash/encryption format | `hash` and `encryption` focused entries in the [catalogue](API-CATALOGUE.md#octagonal-wheels) | Preserve the selected format and key contract. `digestHash` switches from a fallback after asynchronous WASM initialisation; review this before using it for persistent identifiers. |

`fireAndForget` deliberately discards promise rejection. Use it only where ignoring the outcome is part of the caller's policy. `cancelableDelay.cancel()` clears its timer without settling its promise; it is not an abortable sleep which rejects on cancellation.

The [runtime guide](packages/octagonal-wheels/guides/imports-and-runtime.md) contains conversion, timing, notification, and formatting examples. The [catalogue](API-CATALOGUE.md#octagonal-wheels) also covers channels, worker queues, reactive values, hashes, and encryption formats.

## Interaction and notification

Shared workflows accept `UiInteractions`, `UiNotifications`, or a consumer-owned `Pick` of their methods from `@vrtmrz/ui-interactions`. At the composition root, choose `createObsidianUi` from `@vrtmrz/obsidian-plugin-kit/ui` or `createBrowserUi` from `@vrtmrz/browser-ui-kit`.

| Need | API | Selection rule |
| --- | --- | --- |
| Choose an action | `ui.confirmAction` | Branch on a literal action ID, independent of translated display labels. Closing returns `null`. |
| Choose a supplied item | `ui.pickOne` | Returns the original item instance. No label-to-object lookup is needed. Descriptions are not search text. |
| Ask for text or a password | `ui.promptText`, `ui.promptPassword` | Submitted `""` differs from cancellation `null`. Password masking does not store or encrypt the value. |
| Show a message and await acknowledgement | `ui.showMessage` | Keep the decision about what to display in the caller. |
| Update a non-blocking status message | `notifications.show(key, options)` | Reusing the key updates its notification and restarts expiry. The adapter owns visible resources. |
| Hide notifications or end their owner | `hide`, `hideAll`, `dispose` | Disposal is terminal; the application owns when it happens. |
| Intercept an interaction in a test | `createDrivenUiInteractions`, `createScriptedUiDriver` | A driver can handle or pass through a request. It belongs to one application/test instance. |

```ts
import type { UiInteractions } from "@vrtmrz/ui-interactions";

async function askToReplace(
  ui: Pick<UiInteractions, "confirmAction">,
): Promise<boolean> {
  const action = await ui.confirmAction({
    title: "Replace saved value",
    message: "Replace the existing value?",
    actions: ["replace", "cancel"] as const,
    labels: { replace: "Replace", cancel: "Cancel" },
    defaultAction: "cancel",
  });
  return action === "replace";
}
```

Direct Obsidian functions remain convenient for platform-specific code. The following subpaths start with `@vrtmrz/obsidian-plugin-kit/`:

| Need | Entry and API | Contract |
| --- | --- | --- |
| Direct dialogues | `dialog`: `confirmAction`, `pickOne`, `promptText`, `promptPassword`, `showMessage` | Explicit `App` and optional lifecycle signal. The neutral interaction methods do not expose that lifecycle argument. |
| One Notice per status key | `notice`: `KeyedNoticeManager`, `createObsidianUiNotifications` | Update the existing Notice and dispose its owner on unload. |
| Several status lines in one Notice | `notice`: `KeyedNoticeGroupManager.setItem`, `.finish` | Updates preserve item order. `finish` starts completion expiry; another update cancels it. |
| Progress UI | `progress`: `ProgressFragment`, `showProgressNotice` | For a changing total, choose `autoComplete: false` and call `complete` explicitly. Clean up unfinished notices on unload. |
| Command selection and execution | `command`: `createCommandCheck` | Checking does not execute. All falsey selections mean unavailable. The action has a synchronous `void` contract. |
| Inject text-file operations | `vault`: `createObsidianVaultTextAccess` | Supplies `readText`, `createText`, `modifyText`, and `appendText` with stable missing/existing errors. |
| Inject frontmatter updates | `vault`: `createObsidianVaultFrontmatterAccess` | Delegates to `processFrontMatter`; its updater must be synchronous. |

The text adapter does not make a separate read and write atomic. For a transformation of the current file contents, Obsidian's [`Vault.process`](https://docs.obsidian.md/Plugins/Vault) supplies the corresponding read-modify-write contract. Consumer-specific conflict handling remains with the caller.

Browser adapters allow an explicit presenter and Markdown renderer; the default presentation is plain text. See the [neutral UI guide](packages/ui-interactions/docs/usage-guide.md), [Obsidian guide](packages/obsidian-plugin-kit/docs/usage-guide.md), and [browser guide](packages/browser-ui-kit/docs/usage-guide.md).

## State and storage

Select the value model and lifetime before selecting a backend. Existing OW storage formats are not automatically migrated by choosing a Kit store.

| Need | API / entry | Why choose it |
| --- | --- | --- |
| Temporary key/value state | Native `Map`, or `MemoryValueStore` from `@vrtmrz/value-store` | Use the store when production's asynchronous value contract should also apply in tests. |
| Bounded memoised state | OW `memory/LRUCache` | Eviction by entry count and approximate size is different from authoritative storage. |
| Weakly held values which may be garbage-collected | OW `memory/VolatileValueCache` | Hold a pin while using the value and release it afterwards. This is not timed expiry. |
| Observable in-memory state | OW `dataobject/reactive` | Use reactive sources and computed subscriptions. |
| Cache the latest computation or refine a value | OW `dataobject/Computed`, `dataobject/Refiner` | `Computed` caches evaluation for its latest arguments; it does not add reactive subscriptions. |
| IndexedDB values, key enumeration, or existing OW store formats | OW `databases/KeyValueDB`, `databases/SimpleStoreIDB` | Preserve those APIs' value, enumeration, and persistence contracts. |
| A persisted map | OW `dataobject/PersistentMap` | Preserve its map format and delayed-save contract. For acknowledged persistent queues, see [specialised coordination](#specialised-and-existing-coordination-apis). |
| Ordinary strings and JSON across backends | `@vrtmrz/value-store`: `ValueReader`, `ValueStore` | Neutral asynchronous reads/replacements, validation, snapshots, and fixed error categories. |
| Inject a raw backend | `createValueReader`, `createValueStore`, `createDeletableValueStore` | Supply only the raw `get`, `set`, and optional `delete` operations required. |
| Browser Web Storage | `createWebStorageValueStore` from `@vrtmrz/value-store/web-storage` | Explicit Storage object and literal prefix; no automatic global selection. |
| Obsidian host local storage | `createObsidianLocalStore`, `createCompatibleObsidianLocalStore` from `@vrtmrz/obsidian-plugin-kit/local-storage` | Explicit host and prefix. Compatibility selection happens once; backend failures do not trigger fallback. |
| Small, infrequently updated Node state | `createJsonFileValueStore` from `@vrtmrz/value-store/node-json-file` | Dedicated bounded JSON document, replaced as a whole. Synchronous file I/O; no coordination between writer processes. |
| Growing Node state and transactional batches | `createSqliteFileValueStore`, `createSqliteValueStore` from `@vrtmrz/value-store/node-sqlite` | Managed file/connection or borrowed host connection. Explicit namespace and prefix. Check the [runtime requirements](packages/value-store/README.md#use-sqlite-for-growing-state). |
| Named secrets | `SecretReader`, `SecretStore` from `@vrtmrz/secret-store` | Portable name/value validation and sanitised failures. No implicit backend discovery, deletion, or listing. |
| Obsidian-managed secrets | `createObsidianSecretStore` from `@vrtmrz/obsidian-plugin-kit/secrets` | Inject `app.secretStorage`; the host owns persistence and sharing. |
| age-encrypted files | `createAgeFileSecretReader`, `createAgeFileSecretStore` from `@vrtmrz/secret-store-node/age` | Explicit private directory, recipients, and identity provider. Provisioning remains with the application. |

Ordinary Obsidian plug-in `data.json` remains accessible through [`Plugin.loadData` and `Plugin.saveData`](https://docs.obsidian.md/oo/plugin). Choose a store adapter when its capability and backend contract suit the workflow; changing the interface does not migrate existing data or validate an application settings schema.

### Keep absence, values, and failures distinct

| Operation | Meaning |
| --- | --- |
| `getValue(key)` returns `null` | No stored value. |
| `getObject(key)` returns `undefined` | No stored JSON value. Stored JSON `null` remains `null`. |
| `setValue(key, '')`; `setObject` with `null`, `false`, `0`, or `''` | Store data, including falsey values. |
| A getter default | Used only for absence; never persisted and never substituted for a read/decode failure. |
| `delete(key)` through `ValueDeleter` | Explicit deletion, without serialising an empty value. |
| `ValueSerializer.serialize` / `.deserialize` | A paired, instance-owned transformation of stored strings. No automatic encryption. |
| `ValueStoreError.code` | A fixed failure category. Consumer recovery policy decides what follows. |

`setObject` validates JSON-shaped values and takes a snapshot before awaiting. It rejects unsupported values and cycles without invoking accessors or `toJSON`. This differs from `cloneViaJSON`, which deliberately follows native JSON conversion semantics.

The official Obsidian local-storage backend treats a physical empty-string write as deletion. Its adapter rejects such an output before calling the host. A serializer can encode a logical empty string into a non-empty representation. The explicit legacy Web Storage adapter has its own representability rules.

### Request extra capabilities explicitly

`ValueStore` contains read and replacement-write operations. Deletion, batching, clearing, and disposal are separate capabilities:

- `ValueBatchWriter.writeBatch` prepares all values before applying operations. Backend guarantees differ: Web Storage can partially apply a batch, SQLite uses a transaction, and the JSON adapter replaces one whole document.
- `ValueClearer.clear` clears the selected store scope. Stop producers and await their work first if later writes must not repopulate it.
- `ValueStoreDisposer.dispose` stops new admission and drains accepted operations. Inspect individual operation promises for their failures; successful disposal does not prove every write succeeded.
- A borrowed SQLite store disposes its adapter without closing the host's database connection.

`SecretStore` adds the secret naming profile to value operations; it does not itself add encryption or an OS keychain. Pass a raw secret name to the store. Reference URI parsing, missing-secret decisions, key acquisition, and migrations belong to the consumer.

See the [ValueStore README](packages/value-store/README.md), [SecretStore README](packages/secret-store/README.md), and [Node secret adapter](packages/secret-store-node/README.md).

## Test at the boundary you own

| Boundary | Tool | What still needs consumer or runtime verification |
| --- | --- | --- |
| Workflow choices and responses | `createUiTestHarness` from `@vrtmrz/ui-interactions/testing` | Assert the requested interactions and call `assertDone`; real Modal rendering, focus, and theme are separate. |
| Text/frontmatter workflow | Vault fixtures from `@vrtmrz/obsidian-plugin-kit/testing` | Filesystem/host behaviour, YAML formatting, MetadataCache, and Vault events are not reproduced by memory fixtures. |
| State or secret composition | `MemoryValueStore`, `MemorySecretStore`, injected raw backends | Backend persistence, permissions, encryption, and application migrations require their own evidence. |
| Real plug-in bootstrap | `createTemporaryVault`, `startObsidianPluginSession`, `withObsidianPage` | Consumer settings, data, selectors, and assertions remain consumer-owned. |
| Rendered layout | `inspectLocatorLayout` and layout assertions from `@vrtmrz/obsidian-test-session` | Select the relevant locator and dimensions; an emulated viewport is not physical mobile-device evidence. |

Use the high-level session for the standard bootstrap. Prepare renderer state through `localStorageEntries` or `beforePluginStart` when it must precede the first plug-in load. On successful start, the caller owns stopping the process and then disposing the Vault; see the [session lifecycle example](packages/obsidian-test-session/docs/usage-guide.md#compose-a-consumer-owned-session-fixture).

The [proven-in-use record](docs/proven-in-use.md) distinguishes package-owned guarantees from consumer integration and real-runtime evidence.

## Specialised and existing coordination APIs

For new finite workflows, start with [scopes and bounded iteration](#cleanup-and-concurrency). Use `withScope` for ownership and cleanup, `withCancellation` for cooperative cancellation, and `forEachInScope` / `mapInScope` to await admitted work and its cleanup. Use `createAsyncQueue` when the workflow also needs a transient input queue.

The APIs below address additional coordination contracts or support existing implementations. Consult them when those requirements are present. Their presence in the catalogue does not make them the default building blocks for a new workflow. The import paths start with `octagonal-wheels/`.

| Specific requirement or existing API | Focused entry | Selection rule |
| --- | --- | --- |
| Existing batched or multi-stage `QueueProcessor` pipeline | `concurrency/processor` | Prefer scoped iteration for new finite batches. An existing pipeline may additionally depend on batching thresholds, delays, intervals, and termination semantics; preserve those when assessing migration. |
| Capacity-limited producer/consumer handoff with `Inbox`, `Clerk`, or `ClerkGroup` | `bureau/Inbox`, `bureau/Clerk` | Start with scoped iteration for finite item processing. Construct an inbox/worker arrangement when producers must wait for buffer capacity and consumers must wait for input. Scope cleanup alone does not provide that handoff. |
| Synchronous producer to `ReadableStream` bridge using `StreamInbox` | `bureau/StreamInbox` | Select it for the stream's pull, close, and overflow contract. `post` returns `false` on overflow; the producer owns that policy. A scope can own its lifetime. |
| Keyed rendezvous using `SlipBoard` | `bureau/SlipBoard`; re-exported by `messagepassing/signal` | `awaitNext`, `submit`, and `issueAndProceed` coordinate keyed results. A scope can own the surrounding work but does not supply keyed delivery. |
| Late connection of a function or instance | `conduit/connector`: `Connector.funcOf`, `.instanceOf` | Begin with explicitly passed functions or capabilities. Use a connector when waiting for later connection is itself required; synchronous invocation throws while disconnected. |
| Named predicate sets or regulated work | `conduit/manifold`: `Manifold`; `conduit/regulator`: `Regulator` | Prefer direct composition or scoped iteration for ordinary workflows. These APIs add predicate registration or a separate work pump; `invokeAll` does not promise input-order results. |
| Request/reply, broadcast, or multi-handler queries | `channel/channels`, `channel/transport` | Choose the response model and transport explicitly. Broadcast invocation does not await handlers; a survey returns individual response promises. |
| Acknowledged or recoverable queued work | `BackedQueue/MemoryBackedQueue`, `BackedQueue/PersistentIDBBackedQueue`, `BackedQueue/HalfPersistentIDBBackedQueue` | Prefer scoped iteration for finite work or `createAsyncQueue` for transient input. Queue acknowledgement, `commit` / `requeue` / `revoke`, dead-letter handling, and persistent-backend restart recovery are separate requirements. A scope does not add persistence or recovery. |
| Existing actor dispatch | `actor` | `Actor.hub` has global state, name-based replacement, and per-instance queues. Prefer explicitly supplied capabilities for a new workflow. |

These selection priorities do not change API availability or deprecation status. Follow the [catalogue's compatibility notes](API-CATALOGUE.md#compatibility-entries) and each symbol's documented contract when maintaining existing code.
