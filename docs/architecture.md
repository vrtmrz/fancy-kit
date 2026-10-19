# Package architecture

This repository contains eight independently versioned packages and one public-source Obsidian harness application. Sharing a workspace does not make their APIs or release lifecycles inseparable.

## Dependency direction

```text
@vrtmrz/ui-interactions
          ↑                         ↑
@vrtmrz/browser-ui-kit      @vrtmrz/obsidian-plugin-kit  ──peer──> obsidian

@vrtmrz/secret-store  <────  @vrtmrz/obsidian-plugin-kit/secrets
          ↑
@vrtmrz/secret-store-node/age  ────> age-encryption and Node filesystem APIs

@vrtmrz/local-storage  <──── @vrtmrz/obsidian-plugin-kit/local-storage
  ├─ ./web-storage (injected Storage)
  └─ ./node ────────────────> Node filesystem APIs

octagonal-wheels             (independent shared utilities)

@vrtmrz/obsidian-test-session  ──peer──> playwright
          ↑ dev-time
consumer E2E suites and the public harness
```

`@vrtmrz/secret-store` owns named-secret read/write contracts, portable validation, sanitised errors, and instance-scoped memory storage. It has no runtime dependencies or Node, DOM, Obsidian, or cryptographic imports. Consumers own reference parsing and backend selection. The plug-in kit provides a focused `./secrets` adapter; the Node package provides a focused `./age` adapter. Native credential adapters remain future work.

`@vrtmrz/ui-interactions` owns framework-neutral interaction contracts, dispatch, scripted drivers, transcripts, and the App-free harness. It must not import Obsidian or browser APIs.

`@vrtmrz/browser-ui-kit` owns framework-free browser DOM implementations of the neutral interaction and notification contracts. It may depend on the neutral interaction package, but it must not emulate Obsidian APIs or contain consumer-specific rendering policy.

`@vrtmrz/obsidian-plugin-kit` owns Obsidian-specific Modal, SuggestModal, MarkdownRenderer, Notice, focus, lifecycle, and focused Vault adapters. It may expose narrow path-based capabilities and App-free harnesses when they make Obsidian workflows injectable without claiming to be a cross-platform filesystem. It may depend on the neutral interaction package. It must not contain LiveSync domain behaviour.

`octagonal-wheels` owns reusable utilities and structural algorithms that do not express Obsidian UI or LiveSync domain policy. It retains its existing package name, history, version, browser-compatible modules, and independent release lifecycle.

`@vrtmrz/obsidian-test-session` is Node-only development infrastructure. It owns local Obsidian binary discovery and preparation, isolated vault and profile state, process lifecycle, CLI bootstrap, Playwright/CDP readiness, and generic layout measurements and assertions for consumer-selected locators. It does not belong in a plug-in runtime bundle.

## Consumer ownership

Consumers own their settings, fixtures, databases, synchronisation workflows, showcase stories, selectors, and domain-specific assertions. The test session package returns `cliEnv` and `remoteDebuggingPort` so a consumer can perform domain-specific CLI or renderer operations without adding those operations to the shared package. Generic inspection helpers may measure a locator supplied by the consumer, but must not select plug-in UI, scan the complete document, or encode a consumer's expected workflow.

LiveSync replication, database, storage composition, and domain-specific service contracts remain in `livesync-commonlib`. Only reusable Obsidian adapters belong in the plug-in kit.

## Import rules

- Import another workspace package through its npm package name, never through a sibling `src` path.
- Keep `obsidian` and `playwright` as peer dependencies at their respective integration boundaries.
- Keep scripted UI state instance-scoped. Do not add static response queues or module-global drivers.
- Preserve explicit `null` cancellation semantics when migrating a consumer.
- Build and pack packages before relying on their declarations or export maps from another repository.
- Preserve focused imports and `sideEffects: false`. Packed-consumer verification bundles the App-free testing entry and a root-level named Vault import to ensure unrelated Obsidian feature modules do not remain in consumer output.
- Keep scripted steps discriminated by interaction kind so callbacks receive the matching request type and automated results are checked before runtime validation.
- Keep the complete `UiInteractions` adapter at the consumer composition root. Workflows that use a subset should define a local, application-named `Pick<UiInteractions, ...>` capability rather than adding consumer policy groupings to this package.

## Workspace application

`apps/obsidian-harness` is a component catalogue, guided contract runner, and real-Obsidian fixture. `test/e2e-obsidian` owns its external stories and assertions while consuming the shared test session package. The application is not an npm package. Versioned Screwdriver documents are attached to Fancy Kit releases, reflected into the same-origin Pages site, verified in the browser, and passed to Obsidian through the Clipboard form of Obsidian URI. See [the harness architecture](harness.md) for its modes, one-shot automation request, safety boundary, and distribution path.

## UI composition roles

Keep the three UI roles distinct:

- `UiInteractions` is the neutral capability accepted by an application workflow;
- `createBrowserUi` creates the concrete browser adapter at a web application composition root;
- `createObsidianUi` creates the concrete Obsidian adapter at the consumer composition root; and
- `UiInteractionDriver` is an optional, instance-scoped interceptor used to observe a request, provide a scripted response, or pass the request to the adapter.

The driver is not a platform abstraction and does not select a runtime platform. Browser, Obsidian, and future platform implementations can satisfy `UiInteractions` without changing workflow code. Preserve focused direct imports for simple platform UI code, keep scripted state instance-scoped, and keep cross-platform behaviour in the neutral contract rather than either platform kit.

## Rooted storage composition

Fancy Kit does not yet expose a platform-neutral filesystem package. If repeated consumer pilots justify one, keep root acquisition separate from adapter creation:

- the consumer selects and authorises a root, such as a CLI-configured directory, a granted File System Access API directory handle, an Obsidian Vault adapter, a desktop backup directory, or a logical remote key prefix;
- the consumer passes that root once at its composition root;
- an explicit platform factory returns an adapter whose operations accept root-relative paths; and
- the adapter validates path containment without rediscovering, mutating, or requesting its root.

This resembles `createObsidianUi` only in placing concrete construction at the composition root. A storage factory must also bind filesystem authority. It must not open a directory picker, parse command-line arguments, or select a platform automatically. Prefer separate factories such as `createNodeStorage({ rootPath })` and `createFileSystemAccessStorage({ rootHandle })` over a union-typed generic factory; names are illustrative until the neutral contract is designed.

Before extraction, settle lexical and symbolic-link containment, missing and permission errors, metadata fidelity, destructive-operation semantics, and atomicity. Keep absolute paths used by legacy consumers outside the neutral contract. Until those decisions are proven by more than one consumer, LiveSync-specific filesystem composition remains in `livesync-commonlib`, and Obsidian-specific Vault access remains in `@vrtmrz/obsidian-plugin-kit`.

## Secret storage

[ADR 0001](adr/0001-secret-store-boundaries.md) established the neutral core in `@vrtmrz/secret-store`; [ADR 0002](adr/0002-value-store-serialisation.md) records the accepted asynchronous value and object API. The core exports `SecretReader`, `SecretStore`, `ObjectValue`, `ValueSerializer`, fixed errors, and instance-scoped memory storage. Readers expose asynchronous `getValue` and `getObject`; stores add `setValue` and `setObject`, with no delete or list capability. Each instance may receive one paired serializer. Its public type is structurally compatible with the local-storage serializer type, without a runtime dependency between the packages.

The [age feasibility checks](design/secret-store-age-feasibility.md) under `test/secret-store-age` exercise the Node package's internal codec. `@vrtmrz/secret-store-node/age` owns explicit-root filesystem authority, bounded reads, identity-provider calls, and ciphertext-only atomic replacement. Its public capabilities use asynchronous string/object methods even though file operations remain synchronous. The optional `ValueSerializer` is an additional consumer-owned transformation at the neutral core boundary, not a replacement for age encryption. The adapter depends on the neutral core and pinned `age-encryption`, and only the focused `./age` entry is exported.

## Key/value and local storage

The accepted [local-storage design](design/key-value-and-local-storage.md) defines a separate asynchronous string and JSON-object package. `@vrtmrz/local-storage` exports `LocalValueReader`, `LocalValueStore`, `ObjectValue`, `ValueSerializer`, fixed errors, and instance-scoped memory storage from its root entry. Readers provide `getValue` and `getObject`; stores add `setValue`, `setObject`, and explicit `delete`. A missing value is `null`; `getObject` returns `undefined` for absence and preserves stored JSON `null`. `setValue('')` deletes before serialisation, while `setObject` stores an empty string, `false`, zero, or `null` as JSON data.

An optional paired `ValueSerializer` converts logical strings before a raw string backend and restores them on reads. Object operations pass JSON text through that same boundary. The pair may be synchronous or asynchronous, is captured once per store, and defaults to identity conversion. The neutral factories accept injected raw backends; the Web Storage adapter is at `./web-storage`, and the explicit Node file adapter at `./node`. All public operations return promises, even where a selected backend performs synchronous I/O. Keys and explicit prefixes remain literal.

The focused `@vrtmrz/obsidian-plugin-kit/local-storage` entry adapts Obsidian's synchronous App methods through the same asynchronous contract. The App owns Vault scoping; the application supplies the complete literal plug-in prefix. Obsidian's `saveLocalStorage(key, null)` performs deletion, and the adapter maps local deletion to that call. JSON values are encoded to strings before reaching the host, so nested and top-level falsy JSON data are stored through `setObject`. A compatibility selector considers its explicit legacy Web Storage source only when both official methods are absent; it does not migrate data or switch sources after an operation failure.

Earlier host probes observed that Obsidian 1.13.6 can suppress underlying storage failures. The adapter cannot distinguish a suppressed read failure from absence or confirm a write the host reports as complete. The Phase 3d workspace, packed-consumer, browser persistence, and reviewed Obsidian 1.13.6 checks have passed, including string/object persistence after restart. The existing `obsidian >=1.8.7` peer floor is unchanged; the 1.7.7 probe remains unverified. The Node file adapter keeps its strict version-1 string-pair document and inclusive 1 MiB UTF-8 limit; its public API is asynchronous although file operations remain synchronous.

This package does not replace the existing IndexedDB `KeyValueStore` family or `PersistentMap`, whose formats and behaviour remain unchanged. Local value storage is not a secret store and adds no encryption or secret-management guarantees.
