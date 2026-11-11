# Fancy Kit API catalogue

Use the [consumer cheat sheet](CHEATSHEET.md) to choose an operation. This catalogue provides method navigation and an inventory of public runtime exports across the workspace. Linked source entries contain the corresponding option types, overloads, getters, and contracts; OW also has a [generated API reference](packages/octagonal-wheels/docs/modules.md).

Prefer focused, extensionless imports. A category can export namespaces rather than constructors: for example, import `EventHub` from `octagonal-wheels/events`, but import `LRUCache` from `octagonal-wheels/memory/LRUCache`. Do not infer an import path from a class name. Platform entries retain their runtime requirements; see the [architecture](docs/architecture.md) and [OW runtime guide](packages/octagonal-wheels/guides/imports-and-runtime.md).

[Methods](#methods-by-capability) · [Store capabilities](#store-capabilities-by-factory) · [Obsidian sessions](#obsidian-session-operations) · [Compatibility](#compatibility-entries) · [Public entries](#public-entry-inventory) · [OW entries](#octagonal-wheels)

## Methods by capability

These are the principal operations to look for on a returned capability or instance. They are not additional standalone exports.

| Capability or instance | Methods | Reference |
| --- | --- | --- |
| `Scope` | `defer`; borrowed input is `value` | [Scope](packages/octagonal-wheels/src/resource/scope.ts) |
| `ScopedPipeline` | callable step, `pipe`, `pipeScoped` | [Scope](packages/octagonal-wheels/src/resource/scope.ts) |
| `OwnedResource` | `dispose`; owned resource is `value` | [Resource](packages/octagonal-wheels/src/resource.ts) |
| Cancellation scope | `isCancelled`; owned signal is `signal` | [Cancellation](packages/octagonal-wheels/src/concurrency/cancellation.ts) |
| Semaphore object | `acquire`, `tryAcquire`; a successful acquisition returns the release function; inspect `waiting` | [Semaphore entry](packages/octagonal-wheels/src/concurrency/semaphore.ts) |
| Deferred action | `schedule`, `cancel`, `dispose` | [Deferred action](packages/octagonal-wheels/src/concurrency/deferredAction.ts) |
| Async queue | `enqueue`, `finish`, `dispose`, asynchronous iteration | [Async queue](packages/octagonal-wheels/src/iterable/asyncQueue.ts) |
| `EventHub` | `on`, `once`, `off`, `offAll`, `emitEvent`, `onEvent`, `onceEvent`, `waitFor` | [Events](packages/octagonal-wheels/src/events/EventHub.ts) |
| Notifier / coalescing notifier | `wait`, `notify` / `update`, `flush`, `dispose` | [Notifier](packages/octagonal-wheels/src/concurrency/notifier.ts), [coalescing](packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts) |
| Screen wake-lock manager / lease | manager `run`, `acquire`, `dispose`; lease `dispose` | [Wake lock](packages/octagonal-wheels/src/browser/wakeLock.ts) |
| `Inbox` | `post`, `pick`, `tryPost`, `tryPick`, `tryCancelPost`, `dispose` | [Inbox](packages/octagonal-wheels/src/bureau/Inbox.ts) |
| `SlipBoard` | `isAwaiting`, `issueAndProceed`, `awaitNext`, `submit`, `submitToAll`, `reject` | [SlipBoard](packages/octagonal-wheels/src/bureau/SlipBoard.ts) |
| Connector function / instance | function `connect`, `invoke`, `invokeSync`, `disconnect`; instance `connect`, `connected`, `connectedSync`, `disconnect` | [Connector](packages/octagonal-wheels/src/conduit/connector.ts) |
| `Manifold` | `add`, `remove`, `clear`, `set`, `some`, `any`, `every`, `all` | [Manifold](packages/octagonal-wheels/src/conduit/manifold.ts) |
| Regulator | `maxConcurrency`, `onProcess`, `invoke`, `invokeAll` | [Regulator](packages/octagonal-wheels/src/conduit/regulator.ts) |
| Channel / transport | channel `register`, `invoke`, `query`, `close`; transport `subscribe`, `publish`, `close` | [Channels](packages/octagonal-wheels/src/channel/channels.ts), [transport](packages/octagonal-wheels/src/channel/transport.ts) |
| `BackedQueue` and its implementations | `enqueue`, `dequeue`, `process`, `commit`, `requeue`, `revoke`, `isQueueEmpty`, `isAnyInFlight`, `waitForEmptyQueue` | [Queue](packages/octagonal-wheels/src/BackedQueue/BackedQueue.ts) |
| `SimpleStoreIDB` | static `open`; `get`, `set`, `delete`, `keys`, `keysIDB`, `clear`, `close`, `destroy`, `beginTransaction`, `commit`, `abort` | [IndexedDB store](packages/octagonal-wheels/src/databases/SimpleStoreIDB.ts) |
| `PersistentMap` | `get`, `set`, `has`, `delete`, `clear`, `flush` | [Persistent map](packages/octagonal-wheels/src/dataobject/PersistentMap.ts) |
| `Computed` / `Refiner` | computed `updateValue`, `reset`, `update`; refiner `update`; inspect `value` | [Computed](packages/octagonal-wheels/src/dataobject/Computed.ts), [Refiner](packages/octagonal-wheels/src/dataobject/Refiner.ts) |
| `LRUCache` | `clear`, `has`, `get`, `revGet`, `set` | [LRU cache](packages/octagonal-wheels/src/memory/LRUCache.ts) |
| `VolatileValueCache` / pin | cache `set`, `getPin`, `get`, `has`, `delete`; pin `release` | [Weak value cache](packages/octagonal-wheels/src/memory/VolatileValueCache.ts) |
| `GeneratorSource` | `enqueue`, `dispose`, `finish`, `values`, asynchronous iteration | [Generator source](packages/octagonal-wheels/src/iterable/source.ts) |
| `UiInteractions`, `DrivenUiInteractions`, Obsidian/browser UI adapters | `promptText`, `promptPassword`, `pickOne`, `confirmAction`, `showMessage` | [UI contract](packages/ui-interactions/src/contracts.ts) |
| `UiNotifications`, `KeyedNoticeManager`, Obsidian/browser notification adapters | `show`, `has`, `hide`, `hideAll`, `dispose` | [Notifications](packages/ui-interactions/src/notifications.ts) |
| `KeyedNoticeGroupManager` | `setItem`, `finish`, `removeItem`, `has`, `hide`, `hideAll`, `dispose` | [Obsidian notices](packages/obsidian-plugin-kit/src/notice.ts) |
| `ProgressFragment` | `update`, `increment`, `complete`, `cancel`; inspect `snapshot` and `state` | [Progress](packages/obsidian-plugin-kit/src/progress.ts) |
| `ProgressNotice` | `update`, `increment`, `complete`, `cancel`, `hide`; exposes `progress` and `notice` | [Progress](packages/obsidian-plugin-kit/src/progress.ts) |
| `VaultTextAccess` | `readText`, `createText`, `modifyText`, `appendText` | [Vault contracts](packages/obsidian-plugin-kit/src/vault-contracts.ts) |
| `VaultFrontmatterAccess` | `updateFrontmatter` | [Vault contracts](packages/obsidian-plugin-kit/src/vault-contracts.ts) |
| `ScriptedUiDriver` | `handle`, `assertDone`; inspect `remaining` and `transcript` | [UI testing](packages/ui-interactions/src/testing.ts) |
| UI test harness | `assertDone`; exposes `ui`, `driver`, and `transcript` | [UI testing](packages/ui-interactions/src/testing.ts) |
| Vault text test harness | `getFile`, `snapshot`; exposes `vault` and `transcript` | [Vault testing](packages/obsidian-plugin-kit/src/vault-testing.ts) |
| Frontmatter test harness | `getFrontmatter`, `snapshot`; exposes `vault` and `transcript` | [Vault testing](packages/obsidian-plugin-kit/src/vault-testing.ts) |
| Browser interaction presenter | `prompt`, `choose` | [Browser interactions](packages/browser-ui-kit/src/interactions.ts) |
| Browser notification presenter / view | presenter `create`; view `update`, `hide`, and `isConnected` | [Browser notifications](packages/browser-ui-kit/src/notifications.ts) |
| `ValueReader`, `SecretReader` | `getValue`, `getObject` | [Value contracts](packages/value-store/src/contracts.ts) |
| `ValueStore`, `SecretStore` | reader methods plus `setValue`, `setObject` | [Value contracts](packages/value-store/src/contracts.ts) |
| `ValueDeleter` | `delete` | [Value contracts](packages/value-store/src/contracts.ts) |
| `ValueBatchWriter`, `ValueClearer`, `ValueStoreDisposer` | `writeBatch`, `clear`, `dispose`, respectively | [Value contracts](packages/value-store/src/contracts.ts) |
| `ValueSerializer` | `serialize`, `deserialize` | [Value contracts](packages/value-store/src/contracts.ts) |
| Temporary Vault / Obsidian process | Vault `dispose`; process `stop` | [Vault](packages/obsidian-test-session/src/vault.ts), [process](packages/obsidian-test-session/src/launch.ts) |

### Store capabilities by factory

All of these stores use `getValue` / `getObject` for reads. Writable stores use `setValue` / `setObject`; raw injected backends instead use `get` / `set`.

| Factory or class | Replacement writes | Delete | Batch / clear / dispose |
| --- | --- | --- | --- |
| `createValueReader`, `createSecretReader`, `createAgeFileSecretReader` | No | No | No |
| `createValueStore`, `createSecretStore`, `MemorySecretStore`, `createObsidianSecretStore`, `createAgeFileSecretStore` | Yes | No | No |
| `createDeletableValueStore` | Yes | Yes | No |
| `MemoryValueStore`, `createWebStorageValueStore`, `createJsonFileValueStore` | Yes | Yes | Yes |
| `createSqliteValueStore`, `createSqliteFileValueStore` | Yes | Yes | Yes |
| `createObsidianLocalStore`, `createCompatibleObsidianLocalStore` | Yes | Yes | No |

Factory return types determine the available capabilities. Structural compatibility does not remove a profile's key/value restrictions or strengthen a backend's persistence guarantee. See [storage selection](CHEATSHEET.md#state-and-storage).

## Obsidian session operations

All functions below come from `@vrtmrz/obsidian-test-session`. Start with `startObsidianPluginSession`; use the lower-level operations when the consumer deliberately owns a different bootstrap order.

| Area | Operations |
| --- | --- |
| Discovery | `discoverObsidianBinary`, `requireObsidianBinary`, `discoverObsidianCli`, `requireObsidianCli` |
| Version and AppImage selection | `selectObsidianVersion`, `normaliseObsidianVersion`, `validatedObsidianRelease`, `resolveObsidianAppImageRelease`, `allowUnverifiedObsidianVersion`, `obsidianE2EVersionPolicy` |
| Linux assets | `obsidianAppImageArchitecture`, `obsidianAppImageInstallDirectory`, `obsidianAppImageAssetName`, `obsidianAppImageUrl`, `fetchObsidianGitHubRelease`, `installObsidianAppImage` |
| Isolation and process | `createTemporaryVault`, `installBuiltPlugin`, `cleanupStaleObsidianE2EProcesses`, `launchObsidian`, `startObsidianPluginSession` |
| CLI | `runObsidianCli`, `openVaultWithObsidianCli`, `evalObsidianJson` |
| Renderer connection and Vault readiness | `obsidianRemoteDebuggingPort`, `withObsidianPage`, `waitForObsidianPageVault`, `waitForObsidianVault` |
| Explicit bootstrap preparation | `preseedTrustedVaultState`, `preseedLocalStorage`, `trustVaultIfPrompted`, `waitForPluginCatalogue` |
| Plug-in loading | `ensurePluginLoaded`, `enablePluginAndSave`, `enableAndReloadPlugin`, `waitForPluginReady` |
| Idle state | `waitForObsidianPageUiIdle`, `waitForObsidianUiIdle` |
| Layout | `inspectLocatorLayout`, `assertNoHorizontalOverflow`, `assertLocatorWithinViewport`, `assertLocatorWithinSafeArea`, `assertLocatorHasMinimumTouchTarget` |

The [session guide](packages/obsidian-test-session/docs/usage-guide.md) explains ordering, ownership, version qualification, and the scope of process cleanup.

## Compatibility entries

An exported name is not automatically the preferred choice for new code. Preserve existing formats and choose replacements by contract:

- `createUiContext` is a deprecated alias; new composition uses `createObsidianUi`.
- OW `promiseWithResolver` is deprecated in favour of `promiseWithResolvers`; `concurrency/scopedIteration` is a compatibility re-export of `concurrency/scoped.iteration`.
- OW versioned lock, semaphore, and processor entries remain for compatibility. Check symbol-level deprecation notes; prefer the current focused entry and scoped wrappers for new lifecycle-aware code.
- `SimpleStoreIDB` / `SimpleStoreIDBv2` direct constructors are deprecated in favour of asynchronous `open`. This does not deprecate the entire store class.
- Legacy UTF-16 decoding and CRC-derived hashes may be needed to read existing data. Do not substitute an encoding or hash without considering stored-format compatibility.
- Encryption entry points represent specific payload formats. Follow their format and key contracts; secret storage and key provisioning are separate concerns.
- A version suffix alone does not establish deprecation. The versioned reactive and signal entries retain their documented contracts.

## Public entry inventory

The tables below account for extensionless package exports. `.js` spellings alias the corresponding OW entries; `octagonal-wheels/package.json` exposes metadata. Type-only exports are available from the linked source but are omitted from the runtime-name column. Namespace exports are marked explicitly: import a member from its focused entry, or access it through that namespace. Internal and deprecated implementation filenames excluded by the package export map are not import targets.

The root entries often aggregate focused entries. Their repeated names are intentional, and do not imply identical runtime dependencies between the aggregate and focused imports.

## Octagonal Wheels

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `octagonal-wheels` | `libVersion`, `binary` (namespace), `common` (namespace), `concurrency` (namespace), `dataobject` (namespace), `databases` (namespace), `hash` (namespace), `memory` (namespace), `messagepassing` (namespace), `modification` (namespace), `collection` (namespace), `function` (namespace), `object` (namespace), `path` (namespace), `promises` (namespace), `string` (namespace), `number` (namespace), `encryption` (namespace), `context` (namespace), `actor` (namespace), `events` (namespace), `iterable` (namespace), `bureau` (namespace), `conduit` (namespace), `channel` (namespace), `BackedQueue` (namespace), `browser` (namespace), `notation` (namespace), `encoding` (namespace) | [Source](packages/octagonal-wheels/src/index.ts) |
| `octagonal-wheels/actor` | `ActorHub`, `Actor`, `LogActorBase` | [Source](packages/octagonal-wheels/src/actor.ts) |
| `octagonal-wheels/BackedQueue` | `QueueBackendTypes` (namespace), `QueueBackendMemory` (namespace), `QueueBackend` (namespace), `BackedQueueTypes` (namespace), `BackedQueue` (namespace), `PersistentIDBackedQueueBase` (namespace), `PersistentIDBackedQueue` (namespace), `HalfPersistentIDBackedQueue` (namespace), `MemoryBackedQueue` (namespace) | [Source](packages/octagonal-wheels/src/BackedQueue/index.ts) |
| `octagonal-wheels/BackedQueue/BackedQueue` | `BackedQueue`, `PersistentIDBBackedQueueBase` | [Source](packages/octagonal-wheels/src/BackedQueue/BackedQueue.ts) |
| `octagonal-wheels/BackedQueue/BackedQueueTypes` | `QueueError`, `QueueOperationError`, `QueueTimeoutError`, `QueueAbortError`, `RequeuePosition`, `PREFIX_BACKED_QUEUE_PERSISTENT`, `PREFIX_BACKED_QUEUE_HALF_PERSISTENT` | [Source](packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts) |
| `octagonal-wheels/BackedQueue/HalfPersistentIDBBackedQueue` | `HalfPersistentIDBBackedQueue` | [Source](packages/octagonal-wheels/src/BackedQueue/HalfPersistentIDBBackedQueue.ts) |
| `octagonal-wheels/BackedQueue/MemoryBackedQueue` | `MemoryBackedQueue` | [Source](packages/octagonal-wheels/src/BackedQueue/MemoryBackedQueue.ts) |
| `octagonal-wheels/BackedQueue/PersistentIDBBackedQueue` | `PersistentIDBBackedQueue` | [Source](packages/octagonal-wheels/src/BackedQueue/PersistentIDBBackedQueue.ts) |
| `octagonal-wheels/BackedQueue/QueueBackend` | `QueueBackend` | [Source](packages/octagonal-wheels/src/BackedQueue/QueueBackend.ts) |
| `octagonal-wheels/BackedQueue/QueueBackendMemory` | `QueueBackendMemory` | [Source](packages/octagonal-wheels/src/BackedQueue/QueueBackendMemory.ts) |
| `octagonal-wheels/BackedQueue/QueueBackendTypes` | `ERROR_TRANSACTION_NOT_SUPPORTED` | [Source](packages/octagonal-wheels/src/BackedQueue/QueueBackendTypes.ts) |
| `octagonal-wheels/binary` | `decodeBinary`, `encodeBinary`, `base64ToArrayBufferNative`, `base64ToArrayBufferBrowser`, `base64ToArrayBufferInternalBrowser`, `arrayBufferToBase64SingleBrowser`, `arrayBufferToBase64SingleNative`, `arrayBufferToBase64Native`, `arrayBufferToBase64Browser`, `writeString`, `readString`, `base64ToStringBrowser`, `base64ToStringNative`, `tryConvertBase64ToArrayBufferBrowser`, `tryConvertBase64ToArrayBufferNative`, `base64ToArrayBuffer`, `arrayBufferToBase64Single`, `arrayBufferToBase64`, `base64ToString`, `tryConvertBase64ToArrayBuffer`, `toArrayBuffer`, `decodeToArrayBuffer`, `_decodeToArrayBuffer`, `encodeBinaryEach`, `_encodeBinary`, `hexStringToUint8ArrayNative`, `hexStringToUint8ArrayBrowser`, `uint8ArrayToHexStringBrowser`, `uint8ArrayToHexStringNative`, `hexStringToUint8Array`, `uint8ArrayToHexString`, `createTextBlob`, `createBinaryBlob`, `toBlob`, `isBlobContentEqual`, `createTypedArrayReader`, `concatUInt8Array` | [Source](packages/octagonal-wheels/src/binary/index.ts) |
| `octagonal-wheels/binary/arrayBuffer` | `toArrayBuffer` | [Source](packages/octagonal-wheels/src/binary/arrayBuffer.ts) |
| `octagonal-wheels/binary/base64` | `base64ToArrayBufferNative`, `base64ToArrayBufferBrowser`, `base64ToArrayBufferInternalBrowser`, `arrayBufferToBase64SingleBrowser`, `arrayBufferToBase64SingleNative`, `arrayBufferToBase64Native`, `arrayBufferToBase64Browser`, `writeString`, `readString`, `base64ToStringBrowser`, `base64ToStringNative`, `tryConvertBase64ToArrayBufferBrowser`, `tryConvertBase64ToArrayBufferNative`, `base64ToArrayBuffer`, `arrayBufferToBase64Single`, `arrayBufferToBase64`, `base64ToString`, `tryConvertBase64ToArrayBuffer` | [Source](packages/octagonal-wheels/src/binary/base64.ts) |
| `octagonal-wheels/binary/blob` | `createTextBlob`, `createBinaryBlob`, `toBlob`, `isBlobContentEqual` | [Source](packages/octagonal-wheels/src/binary/blob.ts) |
| `octagonal-wheels/binary/encodedUTF16` | `decodeToArrayBuffer`, `_decodeToArrayBuffer`, `encodeBinaryEach`, `_encodeBinary` | [Source](packages/octagonal-wheels/src/binary/encodedUTF16.ts) |
| `octagonal-wheels/binary/hex` | `hexStringToUint8ArrayNative`, `hexStringToUint8ArrayBrowser`, `uint8ArrayToHexStringBrowser`, `uint8ArrayToHexStringNative`, `hexStringToUint8Array`, `uint8ArrayToHexString` | [Source](packages/octagonal-wheels/src/binary/hex.ts) |
| `octagonal-wheels/binary/typedArray` | `createTypedArrayReader`, `concatUInt8Array` | [Source](packages/octagonal-wheels/src/binary/typedArray.ts) |
| `octagonal-wheels/browser` | `createScreenWakeLockManager`, `ScreenWakeLockManagerDisposedError` | [Source](packages/octagonal-wheels/src/browser/index.ts) |
| `octagonal-wheels/browser/wakeLock` | `createScreenWakeLockManager`, `ScreenWakeLockManagerDisposedError` | [Source](packages/octagonal-wheels/src/browser/wakeLock.ts) |
| `octagonal-wheels/bureau` | `inbox` (namespace), `streamInbox` (namespace), `clerk` (namespace), `pacemaker` (namespace), `slipboard` (namespace) | [Source](packages/octagonal-wheels/src/bureau/index.ts) |
| `octagonal-wheels/bureau/Clerk` | `ClerkState`, `SENTINEL_FINISHED`, `SENTINEL_FLUSH`, `ClerkBase`, `Clerk`, `ClerkGroup`, `Porter`, `Feeder`, `Harvester` | [Source](packages/octagonal-wheels/src/bureau/Clerk.ts) |
| `octagonal-wheels/bureau/Inbox` | `NOT_AVAILABLE`, `READY_PICK_SIGNAL`, `READY_POST_SIGNAL`, `DISPOSE_ERROR`, `SyncInbox`, `Inbox`, `EVENT_PROGRESS`, `InboxWithEvent` | [Source](packages/octagonal-wheels/src/bureau/Inbox.ts) |
| `octagonal-wheels/bureau/PaceMaker` | `PaceMaker` | [Source](packages/octagonal-wheels/src/bureau/PaceMaker.ts) |
| `octagonal-wheels/bureau/SlipBoard` | `waitForSignal`, `waitForValue`, `sendSignal`, `sendValue`, `SlipBoard`, `globalSlipBoard` | [Source](packages/octagonal-wheels/src/bureau/SlipBoard.ts) |
| `octagonal-wheels/bureau/StreamInbox` | `createStreamInbox`, `StreamInbox` | [Source](packages/octagonal-wheels/src/bureau/StreamInbox.ts) |
| `octagonal-wheels/channel` | `channels` (namespace), `transport` (namespace) | [Source](packages/octagonal-wheels/src/channel/index.ts) |
| `octagonal-wheels/channel/channels` | `ChannelBase`, `Port`, `Broadcaster`, `MultiCastChannel`, `Pipeline`, `Switch`, `Survey` | [Source](packages/octagonal-wheels/src/channel/channels.ts) |
| `octagonal-wheels/channel/common` | `generateId`, `MessageTypes`, `DEFAULT_QUERY_TIMEOUT_MS` | [Source](packages/octagonal-wheels/src/channel/common.ts) |
| `octagonal-wheels/channel/transport` | `queryViaTransport`, `DirectTransport`, `BroadcastChannelTransport` | [Source](packages/octagonal-wheels/src/channel/transport.ts) |
| `octagonal-wheels/collection` | `arrayToChunkedArray`, `unique`, `range`, `stepCyclicIndex`, `createTypedArrayReader`, `concatUInt8Array` | [Source](packages/octagonal-wheels/src/collection.ts) |
| `octagonal-wheels/collection.array` | `arrayToChunkedArray`, `unique`, `range` | [Source](packages/octagonal-wheels/src/collection.array.ts) |
| `octagonal-wheels/collection.index` | `stepCyclicIndex` | [Source](packages/octagonal-wheels/src/collection.index.ts) |
| `octagonal-wheels/common` | `const` (namespace), `logger` (namespace), `types` (namespace) | [Source](packages/octagonal-wheels/src/common/index.ts) |
| `octagonal-wheels/common/const` | `RESULT_TIMED_OUT`, `RESULT_NOT_FOUND` | [Source](packages/octagonal-wheels/src/common/const.ts) |
| `octagonal-wheels/common/error` | `wrapError`, `LSError`, `LSFatalError` | [Source](packages/octagonal-wheels/src/common/error.ts) |
| `octagonal-wheels/common/logger` | `setGlobalLogFunction`, `Logger`, `info`, `debug`, `verbose`, `notice`, `LOG_LEVEL_DEBUG`, `LOG_LEVEL_VERBOSE`, `LOG_LEVEL_INFO`, `LOG_LEVEL_NOTICE`, `LOG_LEVEL_URGENT`, `LOG_KIND_INFO`, `LOG_KIND_DEBUG`, `LOG_KIND_VERBOSE`, `LOG_KIND_WARNING`, `LOG_KIND_ERROR`, `LEVEL_DEBUG`, `LEVEL_INFO`, `LEVEL_NOTICE`, `LEVEL_URGENT`, `LEVEL_VERBOSE`, `defaultLoggerEnv`, `defaultLogger` | [Source](packages/octagonal-wheels/src/common/logger.ts) |
| `octagonal-wheels/common/polyfill` | `FallbackWeakRef`, `FallbackFinalizationRegistry` | [Source](packages/octagonal-wheels/src/common/polyfill.ts) |
| `octagonal-wheels/common/types` | Type-only entry | [Source](packages/octagonal-wheels/src/common/types.ts) |
| `octagonal-wheels/concurrency` | `lock` (namespace), `processor` (namespace), `semaphore` (namespace), `task` (namespace), `bulk` (namespace), `deferredAction` (namespace), `counting` (namespace), `coalescingNotifier` (namespace), `cancellation` (namespace), `scopedIteration` (namespace), `notifier` (namespace) | [Source](packages/octagonal-wheels/src/concurrency/index.ts) |
| `octagonal-wheels/concurrency/bulk` | `WaitSemaphore`, `BulkBase`, `Batcher`, `BatcherWithTimeout`, `Streamer` | [Source](packages/octagonal-wheels/src/concurrency/bulk.ts) |
| `octagonal-wheels/concurrency/cancellation` | `withCancellation` | [Source](packages/octagonal-wheels/src/concurrency/cancellation.ts) |
| `octagonal-wheels/concurrency/coalescingNotifier` | `createCoalescingNotifier` | [Source](packages/octagonal-wheels/src/concurrency/coalescingNotifier.ts) |
| `octagonal-wheels/concurrency/counting` | `withCounting` | [Source](packages/octagonal-wheels/src/concurrency/counting.ts) |
| `octagonal-wheels/concurrency/deferredAction` | `createDeferredAction` | [Source](packages/octagonal-wheels/src/concurrency/deferredAction.ts) |
| `octagonal-wheels/concurrency/lock` | `serialized`, `onlyLatest`, `shareRunningResult`, `skipIfDuplicated`, `scheduleOnceIfDuplicated`, `scheduleAndRunOnlyLatest`, `withLock`, `withLocks`, `isLockAcquired`, `SYMBOL_SKIPPED`, `ConcurrentTaskController`, `SCHEDULE_SKIPPED` | [Source](packages/octagonal-wheels/src/concurrency/lock.ts) |
| `octagonal-wheels/concurrency/lock_v1` | `serialized`, `shareRunningResult`, `skipIfDuplicated`, `scheduleOnceIfDuplicated`, `isLockAcquired` | [Source](packages/octagonal-wheels/src/concurrency/lock_v1.ts) |
| `octagonal-wheels/concurrency/lock_v2` | `serialized`, `onlyLatest`, `shareRunningResult`, `skipIfDuplicated`, `scheduleOnceIfDuplicated`, `scheduleAndRunOnlyLatest`, `withLock`, `withLocks`, `isLockAcquired`, `SYMBOL_SKIPPED`, `ConcurrentTaskController`, `SCHEDULE_SKIPPED` | [Source](packages/octagonal-wheels/src/concurrency/lock_v2.ts) |
| `octagonal-wheels/concurrency/lock.scoped` | `withLock`, `withLocks`, `isLockAcquired` | [Source](packages/octagonal-wheels/src/concurrency/lock.scoped.ts) |
| `octagonal-wheels/concurrency/notifier` | `createNotifier` | [Source](packages/octagonal-wheels/src/concurrency/notifier.ts) |
| `octagonal-wheels/concurrency/processor` | `stopAllRunningProcessors`, `Notifier`, `QueueProcessor` | [Source](packages/octagonal-wheels/src/concurrency/processor.ts) |
| `octagonal-wheels/concurrency/processor_v1` | `stopAllRunningProcessors`, `Notifier`, `QueueProcessor` | [Source](packages/octagonal-wheels/src/concurrency/processor_v1.ts) |
| `octagonal-wheels/concurrency/processor_v2` | `stopAllRunningProcessors`, `Notifier`, `QueueProcessor` | [Source](packages/octagonal-wheels/src/concurrency/processor_v2.ts) |
| `octagonal-wheels/concurrency/scoped.iteration` | `forEachInScope`, `mapInScope` | [Source](packages/octagonal-wheels/src/concurrency/scoped.iteration.ts) |
| `octagonal-wheels/concurrency/scopedIteration` | `forEachInScope`, `mapInScope` | [Source](packages/octagonal-wheels/src/concurrency/scopedIteration.ts) |
| `octagonal-wheels/concurrency/semaphore` | `Semaphore`, `withSemaphore`, `acquirePermit` | [Source](packages/octagonal-wheels/src/concurrency/semaphore.ts) |
| `octagonal-wheels/concurrency/semaphore_v1` | `Semaphore` | [Source](packages/octagonal-wheels/src/concurrency/semaphore_v1.ts) |
| `octagonal-wheels/concurrency/semaphore_v2` | `Semaphore` | [Source](packages/octagonal-wheels/src/concurrency/semaphore_v2.ts) |
| `octagonal-wheels/concurrency/semaphore.scoped` | `withSemaphore`, `acquirePermit` | [Source](packages/octagonal-wheels/src/concurrency/semaphore.scoped.ts) |
| `octagonal-wheels/concurrency/task` | `unwrapTaskResult`, `processAllGeneratorTasksWithConcurrencyLimit`, `pipeGeneratorToGenerator`, `pipeArrayToGenerator`, `processAllTasksWithConcurrencyLimit`, `mapAllTasksWithConcurrencyLimit`, `scheduleTask`, `cancelTask`, `cancelAllTasks`, `setPeriodicTask`, `cancelPeriodicTask`, `cancelAllPeriodicTask`, `waitForTimeout`, `finishWaitingForTimeout`, `finishAllWaitingForTimeout`, `isWaitingForTimeout`, `sharedTask`, `wrapFunctionAsShared` | [Source](packages/octagonal-wheels/src/concurrency/task.ts) |
| `octagonal-wheels/conduit` | `Connector`, `Manifold`, `manifold`, `Regulator`, `NamedInstance`, `WeakNamedInstance`, `transporterKey`, `PostMessageBackbone`, `_createTransporter`, `Transporters`, `GlobalTransporters` | [Source](packages/octagonal-wheels/src/conduit/index.ts) |
| `octagonal-wheels/conduit/connector` | `Connector` | [Source](packages/octagonal-wheels/src/conduit/connector.ts) |
| `octagonal-wheels/conduit/manifold` | `Manifold`, `manifold` | [Source](packages/octagonal-wheels/src/conduit/manifold.ts) |
| `octagonal-wheels/conduit/NamedInstance` | `NamedInstance`, `WeakNamedInstance` | [Source](packages/octagonal-wheels/src/conduit/NamedInstance.ts) |
| `octagonal-wheels/conduit/regulator` | `Regulator` | [Source](packages/octagonal-wheels/src/conduit/regulator.ts) |
| `octagonal-wheels/conduit/transporter` | `_createTransporter`, `Transporters`, `GlobalTransporters` | [Source](packages/octagonal-wheels/src/conduit/transporter.ts) |
| `octagonal-wheels/conduit/transporterAdapter` | `transporterKey`, `PostMessageBackbone` | [Source](packages/octagonal-wheels/src/conduit/transporterAdapter.ts) |
| `octagonal-wheels/context` | `bindContext`, `bindContextFunc` | [Source](packages/octagonal-wheels/src/context.ts) |
| `octagonal-wheels/databases` | `keyvaluedatabase` (namespace), `simplestorebase` (namespace), `simplestoreidb` (namespace), `SimpleStoreBase` (namespace), `dbcommon` (namespace), `SimpleStoreIDB` (namespace), `SimpleStoreIDBv2` (namespace), `SimpleStoreIDBv1` (namespace) | [Source](packages/octagonal-wheels/src/databases/index.ts) |
| `octagonal-wheels/databases/dbcommon` | `buildIDBRange`, `DATABASE_DESTROYED_ERROR`, `DatabaseError`, `DatabaseTransactionError`, `DatabaseTransactionAbortError`, `ErrorDatabaseDestroyed`, `SIMPLE_STORE_EVENT_TYPES` | [Source](packages/octagonal-wheels/src/databases/dbcommon.ts) |
| `octagonal-wheels/databases/KeyValueDB` | `OpenKeyValueDatabase` | [Source](packages/octagonal-wheels/src/databases/KeyValueDB.ts) |
| `octagonal-wheels/databases/SimpleStoreBase` | `SimpleStoreBase`, `ExtendedSimpleStore` | [Source](packages/octagonal-wheels/src/databases/SimpleStoreBase.ts) |
| `octagonal-wheels/databases/SimpleStoreIDB` | `SimpleStoreIDB` | [Source](packages/octagonal-wheels/src/databases/SimpleStoreIDB.ts) |
| `octagonal-wheels/databases/SimpleStoreIDBv1` | `SimpleStoreIDBv1` | [Source](packages/octagonal-wheels/src/databases/SimpleStoreIDBv1.ts) |
| `octagonal-wheels/databases/SimpleStoreIDBv2` | `SimpleStoreIDBv2` | [Source](packages/octagonal-wheels/src/databases/SimpleStoreIDBv2.ts) |
| `octagonal-wheels/dataobject` | `persistentmap` (namespace), `reactive` (namespace), `refiner` (namespace), `computed` (namespace) | [Source](packages/octagonal-wheels/src/dataobject/index.ts) |
| `octagonal-wheels/dataobject/Computed` | `Computed` | [Source](packages/octagonal-wheels/src/dataobject/Computed.ts) |
| `octagonal-wheels/dataobject/PersistentMap` | `PersistentMap` | [Source](packages/octagonal-wheels/src/dataobject/PersistentMap.ts) |
| `octagonal-wheels/dataobject/reactive` | `reactiveSource`, `reactive`, `computed` | [Source](packages/octagonal-wheels/src/dataobject/reactive.ts) |
| `octagonal-wheels/dataobject/reactive_v1` | `reactiveSource`, `reactive`, `computed` | [Source](packages/octagonal-wheels/src/dataobject/reactive_v1.ts) |
| `octagonal-wheels/dataobject/reactive_v2` | `reactiveSource`, `reactive`, `computed` | [Source](packages/octagonal-wheels/src/dataobject/reactive_v2.ts) |
| `octagonal-wheels/dataobject/Refiner` | `Refiner`, `RefinerSync` | [Source](packages/octagonal-wheels/src/dataobject/Refiner.ts) |
| `octagonal-wheels/encoding` | `encodeAnyArray`, `decodeAnyArray`, `cloneViaJSON` | [Source](packages/octagonal-wheels/src/encoding/index.ts) |
| `octagonal-wheels/encoding/encodeobject` | `encodeAnyArray`, `decodeAnyArray` | [Source](packages/octagonal-wheels/src/encoding/encodeobject.ts) |
| `octagonal-wheels/encoding/json` | `cloneViaJSON` | [Source](packages/octagonal-wheels/src/encoding/json.ts) |
| `octagonal-wheels/encryption` | `OpenSSLCompat` (namespace), `Asymmetric` (namespace), `hkdf` (namespace), `obfuscatePathV2` (namespace), `obfuscatePath` (namespace), `encryptV1`, `encrypt`, `decrypt`, `tryDecrypt`, `testCryptV3`, `testCrypt`, `encryptBinary`, `decryptBinary`, `ENCRYPT_V1_PREFIX_PROBABLY`, `ENCRYPT_V2_PREFIX`, `ENCRYPT_V3_PREFIX`, `isPathProbablyObfuscated`, `generateKey`, `encryptV3`, `decryptV3` | [Source](packages/octagonal-wheels/src/encryption/index.ts) |
| `octagonal-wheels/encryption/asymmetric` | `encryptUInt8ArrayWithSessionKey`, `wrapAesKeyWithPublicKey`, `encryptUInt8Array`, `decryptUInt8Array`, `encryptUInt8ArrayWithPublicKey`, `decryptUInt8ArrayWithPrivateKey`, `encryptConfig`, `decryptConfig`, `generateEncryptionKeyPair`, `generateAgreementKeyPair`, `generateAESSessionKey`, `generateSharedSecretKey`, `exportECDHPublicKey`, `importECDHPublicKey`, `generateIV`, `exportKeyPair`, `exportPublicKey`, `exportPrivateKey`, `importEncryptionPublicKey`, `importEncryptionPrivateKey`, `lengthToBigEndianBytes`, `bigEndianBytesToLength`, `uint8ArrayReader`, `ECDH_CURVE_INDEX`, `ECDH_CURVE_NAMES`, `webCrypto`, `DEFAULT_RSA_MODULUS_LENGTH`, `DEFAULT_RSA_PUBLIC_EXPONENT`, `AES_KEY_LENGTH`, `AES_GCM_IV_LENGTH`, `DEFAULT_ECDH_CURVE`, `LENGTH_FIELD_SIZE`, `HEAD_RSA`, `HEAD_ECDH`, `IV_LENGTH`, `AsymmetricEncryptionErrorBase`, `AsymmetricEncryptionError`, `AsymmetricDecryptionError`, `AsymmetricKeyGenerationError`, `AsymmetricEncryptionArgumentError`, `AsymmetricKeyIOError` | [Source](packages/octagonal-wheels/src/encryption/asymmetric/index.ts) |
| `octagonal-wheels/encryption/asymmetric/asymmetric` | `encryptUInt8ArrayWithSessionKey`, `wrapAesKeyWithPublicKey`, `encryptUInt8Array`, `decryptUInt8Array`, `encryptUInt8ArrayWithPublicKey`, `decryptUInt8ArrayWithPrivateKey` | [Source](packages/octagonal-wheels/src/encryption/asymmetric/asymmetric.ts) |
| `octagonal-wheels/encryption/asymmetric/asymmetricHelper` | `encryptConfig`, `decryptConfig` | [Source](packages/octagonal-wheels/src/encryption/asymmetric/asymmetricHelper.ts) |
| `octagonal-wheels/encryption/asymmetric/common` | `ECDH_CURVE_INDEX`, `ECDH_CURVE_NAMES`, `webCrypto`, `DEFAULT_RSA_MODULUS_LENGTH`, `DEFAULT_RSA_PUBLIC_EXPONENT`, `AES_KEY_LENGTH`, `AES_GCM_IV_LENGTH`, `DEFAULT_ECDH_CURVE`, `LENGTH_FIELD_SIZE`, `HEAD_RSA`, `HEAD_ECDH`, `IV_LENGTH`, `AsymmetricEncryptionErrorBase`, `AsymmetricEncryptionError`, `AsymmetricDecryptionError`, `AsymmetricKeyGenerationError`, `AsymmetricEncryptionArgumentError`, `AsymmetricKeyIOError` | [Source](packages/octagonal-wheels/src/encryption/asymmetric/common.ts) |
| `octagonal-wheels/encryption/asymmetric/keys` | `generateEncryptionKeyPair`, `generateAgreementKeyPair`, `generateAESSessionKey`, `generateSharedSecretKey`, `exportECDHPublicKey`, `importECDHPublicKey`, `generateIV`, `exportKeyPair`, `exportPublicKey`, `exportPrivateKey`, `importEncryptionPublicKey`, `importEncryptionPrivateKey`, `lengthToBigEndianBytes`, `bigEndianBytesToLength`, `uint8ArrayReader` | [Source](packages/octagonal-wheels/src/encryption/asymmetric/keys.ts) |
| `octagonal-wheels/encryption/encryption` | `encryptV1`, `encrypt`, `decrypt`, `tryDecrypt`, `testCryptV3`, `testCrypt`, `encryptBinary`, `decryptBinary`, `ENCRYPT_V1_PREFIX_PROBABLY`, `ENCRYPT_V2_PREFIX`, `ENCRYPT_V3_PREFIX`, `obfuscatePath`, `isPathProbablyObfuscated` | [Source](packages/octagonal-wheels/src/encryption/encryption.ts) |
| `octagonal-wheels/encryption/encryptionv3` | `generateKey`, `encryptV3`, `decryptV3` | [Source](packages/octagonal-wheels/src/encryption/encryptionv3.ts) |
| `octagonal-wheels/encryption/hkdf` | `createPBKDF2Salt`, `encryptBinary`, `encrypt`, `decryptBinary`, `decrypt`, `testEncryptionFeature`, `encryptWithEphemeralSaltBinary`, `encryptWithEphemeralSalt`, `decryptWithEphemeralSaltBinary`, `decryptWithEphemeralSalt`, `HKDF_ENCRYPTED_PREFIX`, `HKDF_SALTED_ENCRYPTED_PREFIX` | [Source](packages/octagonal-wheels/src/encryption/hkdf.ts) |
| `octagonal-wheels/encryption/obfuscatePath` | `obfuscatePath`, `isPathProbablyObfuscated`, `getKeyForObfuscatePath` | [Source](packages/octagonal-wheels/src/encryption/obfuscatePath.ts) |
| `octagonal-wheels/encryption/obfuscatePathV2` | `isPathProbablyObfuscatedV2`, `obfuscatePathV2` | [Source](packages/octagonal-wheels/src/encryption/obfuscatePathV2.ts) |
| `octagonal-wheels/encryption/openSSLCompat` | `CBC` (namespace) | [Source](packages/octagonal-wheels/src/encryption/openSSLCompat/index.ts) |
| `octagonal-wheels/encryption/openSSLCompat/CBC` | `passphraseToKeyMaterial`, `generateIV`, `generateOpenSSLCompatIvKey`, `encryptCBC`, `decryptCBC`, `SALT_PREFIX`, `SALT_LENGTH` | [Source](packages/octagonal-wheels/src/encryption/openSSLCompat/CBC.ts) |
| `octagonal-wheels/events` | `EventHub`, `InterceptiveEventTarget`, `LinkedEventTarget`, `GlobalChannelTarget` | [Source](packages/octagonal-wheels/src/events.ts) |
| `octagonal-wheels/events/CustomEventTargets` | `InterceptiveEventTarget`, `LinkedEventTarget`, `GlobalChannelTarget` | [Source](packages/octagonal-wheels/src/events/CustomEventTargets.ts) |
| `octagonal-wheels/events/EventHub` | `EventHub` | [Source](packages/octagonal-wheels/src/events/EventHub.ts) |
| `octagonal-wheels/function` | `onlyWhenChanged`, `throttle` | [Source](packages/octagonal-wheels/src/function.ts) |
| `octagonal-wheels/hash` | `xxhash` (namespace), `purejs` (namespace), `crc32` (namespace) | [Source](packages/octagonal-wheels/src/hash/index.ts) |
| `octagonal-wheels/hash/crc32` | `crc32CHash`, `crc32CKHash` | [Source](packages/octagonal-wheels/src/hash/crc32.ts) |
| `octagonal-wheels/hash/purejs` | `mixedHash`, `fallbackMixedHashEach`, `fallbackMixedHash`, `sha1`, `sha1Hash`, `epochFNV1a` | [Source](packages/octagonal-wheels/src/hash/purejs.ts) |
| `octagonal-wheels/hash/xxhash` | `digestHash`, `xxhashNew` | [Source](packages/octagonal-wheels/src/hash/xxhash.ts) |
| `octagonal-wheels/iterable` | `chunks` (namespace), `map` (namespace), `source` (namespace), `asyncQueue` (namespace) | [Source](packages/octagonal-wheels/src/iterable/index.ts) |
| `octagonal-wheels/iterable/asyncQueue` | `createAsyncQueue` | [Source](packages/octagonal-wheels/src/iterable/asyncQueue.ts) |
| `octagonal-wheels/iterable/chunks` | `asChunk`, `asFlat` | [Source](packages/octagonal-wheels/src/iterable/chunks.ts) |
| `octagonal-wheels/iterable/map` | `withConcurrency`, `filter`, `map`, `asyncMapWithConcurrency` | [Source](packages/octagonal-wheels/src/iterable/map.ts) |
| `octagonal-wheels/iterable/source` | `generativeBuffer`, `GeneratorSource` | [Source](packages/octagonal-wheels/src/iterable/source.ts) |
| `octagonal-wheels/memory` | `lrucache` (namespace), `memutil` (namespace), `memo` (namespace), `VolatileValueCache` (namespace), `weakMemo` (namespace) | [Source](packages/octagonal-wheels/src/memory/index.ts) |
| `octagonal-wheels/memory/LRUCache` | `LRUCache` | [Source](packages/octagonal-wheels/src/memory/LRUCache.ts) |
| `octagonal-wheels/memory/memo` | `memoWithMap` | [Source](packages/octagonal-wheels/src/memory/memo.ts) |
| `octagonal-wheels/memory/memutil` | `PREFIX_TRENCH`, `PREFIX_EPHEMERAL`, `PREFIX_PERMANENT`, `Trench` | [Source](packages/octagonal-wheels/src/memory/memutil.ts) |
| `octagonal-wheels/memory/VolatileValueCache` | `VolatileValueCache` | [Source](packages/octagonal-wheels/src/memory/VolatileValueCache.ts) |
| `octagonal-wheels/memory/weakMemo` | `weakMemo` | [Source](packages/octagonal-wheels/src/memory/weakMemo.ts) |
| `octagonal-wheels/messagepassing` | `signal` (namespace) | [Source](packages/octagonal-wheels/src/messagepassing/index.ts) |
| `octagonal-wheels/messagepassing/signal` | `waitForSignal`, `waitForValue`, `sendSignal`, `sendValue`, `SlipBoard`, `globalSlipBoard` | [Source](packages/octagonal-wheels/src/messagepassing/signal.ts) |
| `octagonal-wheels/messagepassing/signal_v1` | `waitForSignal`, `waitForValue`, `sendSignal`, `sendValue` | [Source](packages/octagonal-wheels/src/messagepassing/signal_v1.ts) |
| `octagonal-wheels/modification` | `createModificationHandler` | [Source](packages/octagonal-wheels/src/modification.ts) |
| `octagonal-wheels/notation` | `formatDuration` | [Source](packages/octagonal-wheels/src/notation/index.ts) |
| `octagonal-wheels/notation/duration` | `formatDuration` | [Source](packages/octagonal-wheels/src/notation/duration.ts) |
| `octagonal-wheels/number` | `sizeToHumanReadable` | [Source](packages/octagonal-wheels/src/number.ts) |
| `octagonal-wheels/object` | `extractObject`, `isObjectDifferent`, `encodeAnyArray`, `decodeAnyArray` | [Source](packages/octagonal-wheels/src/object.ts) |
| `octagonal-wheels/path` | `parseSafePathComponent`, `isSafePathComponent`, `parseSafeRelativePath`, `isSafeRelativePath`, `resolvePathWithinRoot`, `findPathComponentsExceedingUtf8Limit`, `UnsafePathError` | [Source](packages/octagonal-wheels/src/path.ts) |
| `octagonal-wheels/promises` | `isResolved`, `isSomeResolved`, `polyfillPromiseWithResolvers`, `nativePromiseWithResolvers`, `fireAndForget`, `yieldMicrotask`, `yieldRequestIdleCallback`, `yieldAnimationFrame`, `yieldNextAnimationFrame`, `yieldNextMicrotask`, `cancelableDelay`, `extendableDelay`, `delay`, `promiseWithResolvers`, `promiseWithResolver`, `noop`, `TIMED_OUT_SIGNAL` | [Source](packages/octagonal-wheels/src/promises.ts) |
| `octagonal-wheels/resource` | `createOwnedResource`, `withOwnedResource`, `scope` (namespace) | [Source](packages/octagonal-wheels/src/resource.ts) |
| `octagonal-wheels/resource/scope` | `withScope`, `scoped` | [Source](packages/octagonal-wheels/src/resource/scope.ts) |
| `octagonal-wheels/string` | `replaceAll`, `replaceAllPairs`, `escapeStringToHTML`, `splitDelimitedList`, `joinDelimitedList` | [Source](packages/octagonal-wheels/src/string.ts) |

## @vrtmrz/ui-interactions

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/ui-interactions` | `createDrivenUiInteractions`, `DrivenUiInteractions` | [Source](packages/ui-interactions/src/index.ts) |
| `@vrtmrz/ui-interactions/testing` | `createScriptedUiDriver`, `createUiTestHarness`, `ScriptedUiDriver` | [Source](packages/ui-interactions/src/testing.ts) |

## @vrtmrz/browser-ui-kit

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/browser-ui-kit` | `createBrowserUi`, `DomBrowserInteractionPresenter`, `BrowserUiInteractions`, `BrowserUiContext`, `createBrowserUiNotifications`, `DomBrowserNotificationPresenter`, `BrowserUiNotifications` | [Source](packages/browser-ui-kit/src/index.ts) |
| `@vrtmrz/browser-ui-kit/interactions` | `createBrowserUi`, `DomBrowserInteractionPresenter`, `BrowserUiInteractions`, `BrowserUiContext` | [Source](packages/browser-ui-kit/src/interactions.ts) |
| `@vrtmrz/browser-ui-kit/notifications` | `createBrowserUiNotifications`, `DomBrowserNotificationPresenter`, `BrowserUiNotifications` | [Source](packages/browser-ui-kit/src/notifications.ts) |

## @vrtmrz/obsidian-plugin-kit

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/obsidian-plugin-kit` | `createCommandCheck`, `promptText`, `promptPassword`, `pickOne`, `confirmAction`, `showMessage`, `createObsidianUiNotifications`, `KeyedNoticeManager`, `KeyedNoticeGroupManager`, `ObsidianUiNotifications`, `showProgressNotice`, `ProgressFragment`, `ProgressNotice`, `createObsidianUi`, `createUiContext`, `UiContext`, `createObsidianVaultTextAccess`, `createObsidianVaultFrontmatterAccess`, `VaultFrontmatterAsyncUpdaterError`, `VaultFrontmatterFileNotFoundError`, `VaultFrontmatterUnsupportedFileError`, `VaultTextFileExistsError`, `VaultTextFileNotFoundError`, `ObsidianVaultTextAccess`, `ObsidianVaultFrontmatterAccess`, `createObsidianSecretStore`, `createObsidianLocalStore`, `createCompatibleObsidianLocalStore` | [Source](packages/obsidian-plugin-kit/src/index.ts) |
| `@vrtmrz/obsidian-plugin-kit/command` | `createCommandCheck` | [Source](packages/obsidian-plugin-kit/src/command.ts) |
| `@vrtmrz/obsidian-plugin-kit/dialog` | `promptText`, `promptPassword`, `pickOne`, `confirmAction`, `showMessage` | [Source](packages/obsidian-plugin-kit/src/dialog.ts) |
| `@vrtmrz/obsidian-plugin-kit/notice` | `createObsidianUiNotifications`, `KeyedNoticeManager`, `KeyedNoticeGroupManager`, `ObsidianUiNotifications` | [Source](packages/obsidian-plugin-kit/src/notice.ts) |
| `@vrtmrz/obsidian-plugin-kit/progress` | `showProgressNotice`, `ProgressFragment`, `ProgressNotice` | [Source](packages/obsidian-plugin-kit/src/progress.ts) |
| `@vrtmrz/obsidian-plugin-kit/ui` | `createObsidianUi`, `createUiContext`, `UiContext` | [Source](packages/obsidian-plugin-kit/src/ui-context.ts) |
| `@vrtmrz/obsidian-plugin-kit/vault` | `createObsidianVaultTextAccess`, `createObsidianVaultFrontmatterAccess`, `VaultFrontmatterAsyncUpdaterError`, `VaultFrontmatterFileNotFoundError`, `VaultFrontmatterUnsupportedFileError`, `VaultTextFileExistsError`, `VaultTextFileNotFoundError`, `ObsidianVaultTextAccess`, `ObsidianVaultFrontmatterAccess` | [Source](packages/obsidian-plugin-kit/src/vault.ts) |
| `@vrtmrz/obsidian-plugin-kit/testing` | `createScriptedUiDriver`, `createUiTestHarness`, `ScriptedUiDriver`, `createVaultTextTestHarness`, `createVaultFrontmatterTestHarness`, `VaultFrontmatterAsyncUpdaterError`, `VaultFrontmatterFileNotFoundError`, `VaultFrontmatterUnsupportedFileError`, `VaultTextFileExistsError`, `VaultTextFileNotFoundError` | [Source](packages/obsidian-plugin-kit/src/testing.ts) |
| `@vrtmrz/obsidian-plugin-kit/secrets` | `createObsidianSecretStore` | [Source](packages/obsidian-plugin-kit/src/secrets.ts) |
| `@vrtmrz/obsidian-plugin-kit/local-storage` | `createObsidianLocalStore`, `createCompatibleObsidianLocalStore` | [Source](packages/obsidian-plugin-kit/src/local-storage.ts) |

## @vrtmrz/value-store

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/value-store` | `ValueStoreError`, `sanitiseValueStoreError`, `MemoryValueStore`, `createDeletableValueStore`, `createValueReader`, `createValueStore` | [Source](packages/value-store/src/index.ts) |
| `@vrtmrz/value-store/web-storage` | `createWebStorageValueStore` | [Source](packages/value-store/src/web-storage.ts) |
| `@vrtmrz/value-store/node-json-file` | `createJsonFileValueStore` | [Source](packages/value-store/src/node/index.ts) |
| `@vrtmrz/value-store/node-sqlite` | `createSqliteValueStore`, `createSqliteFileValueStore` | [Source](packages/value-store/src/sqlite/index.ts) |

## @vrtmrz/secret-store

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/secret-store` | `createSecretReader`, `createSecretStore`, `MemorySecretStore`, `validateSecretName` | [Source](packages/secret-store/src/index.ts) |

## @vrtmrz/secret-store-node

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/secret-store-node/age` | `createAgeFileSecretReader`, `createAgeFileSecretStore` | [Source](packages/secret-store-node/src/age.ts) |

## @vrtmrz/obsidian-test-session

| Import | Runtime exports / namespaces | Source |
| --- | --- | --- |
| `@vrtmrz/obsidian-test-session` | `obsidianAppImageArchitecture`, `obsidianAppImageInstallDirectory`, `installObsidianAppImage`, `DEFAULT_VALIDATED_OBSIDIAN_VERSION`, `VALIDATED_OBSIDIAN_RELEASES`, `allowUnverifiedObsidianVersion`, `fetchObsidianGitHubRelease`, `normaliseObsidianVersion`, `obsidianAppImageAssetName`, `obsidianAppImageUrl`, `resolveObsidianAppImageRelease`, `selectObsidianVersion`, `validatedObsidianRelease`, `runObsidianCli`, `openVaultWithObsidianCli`, `evalObsidianJson`, `obsidianE2EVersionPolicy`, `discoverObsidianBinary`, `requireObsidianBinary`, `discoverObsidianCli`, `requireObsidianCli`, `cleanupStaleObsidianE2EProcesses`, `launchObsidian`, `inspectLocatorLayout`, `assertNoHorizontalOverflow`, `assertLocatorWithinViewport`, `assertLocatorWithinSafeArea`, `assertLocatorHasMinimumTouchTarget`, `installBuiltPlugin`, `startObsidianPluginSession`, `obsidianRemoteDebuggingPort`, `withObsidianPage`, `preseedTrustedVaultState`, `preseedLocalStorage`, `waitForObsidianPageVault`, `waitForObsidianVault`, `trustVaultIfPrompted`, `waitForPluginCatalogue`, `ensurePluginLoaded`, `enablePluginAndSave`, `enableAndReloadPlugin`, `waitForPluginReady`, `waitForObsidianPageUiIdle`, `waitForObsidianUiIdle`, `createTemporaryVault` | [Source](packages/obsidian-test-session/src/index.ts) |
