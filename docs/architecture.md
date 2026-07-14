# Package architecture

This repository contains four independently versioned packages and one public-source Obsidian harness application. Sharing a workspace does not make their APIs or release lifecycles inseparable.

## Dependency direction

```text
@vrtmrz/ui-interactions
          ↑
@vrtmrz/obsidian-plugin-kit  ──peer──> obsidian

octagonal-wheels             (independent shared utilities)

@vrtmrz/obsidian-test-session  ──peer──> playwright
          ↑ dev-time
consumer E2E suites and the public harness
```

`@vrtmrz/ui-interactions` owns framework-neutral interaction contracts, dispatch, scripted drivers, transcripts, and the App-free harness. It must not import Obsidian or browser APIs.

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
- `createObsidianUi` creates the concrete Obsidian adapter at the consumer composition root; and
- `UiInteractionDriver` is an optional, instance-scoped interceptor used to observe a request, provide a scripted response, or pass the request to the adapter.

The driver is not a platform abstraction and does not select a runtime platform. A future platform implementation can satisfy `UiInteractions` without changing workflow code or extending the Obsidian plug-in kit. Preserve focused direct imports for simple Obsidian UI code, keep scripted state instance-scoped, and keep cross-platform behaviour outside the plug-in kit.

## Rooted storage composition

Fancy Kit does not yet expose a platform-neutral filesystem package. If repeated consumer pilots justify one, keep root acquisition separate from adapter creation:

- the consumer selects and authorises a root, such as a CLI-configured directory, a granted File System Access API directory handle, an Obsidian Vault adapter, a desktop backup directory, or a logical remote key prefix;
- the consumer passes that root once at its composition root;
- an explicit platform factory returns an adapter whose operations accept root-relative paths; and
- the adapter validates path containment without rediscovering, mutating, or requesting its root.

This resembles `createObsidianUi` only in placing concrete construction at the composition root. A storage factory must also bind filesystem authority. It must not open a directory picker, parse command-line arguments, or select a platform automatically. Prefer separate factories such as `createNodeStorage({ rootPath })` and `createFileSystemAccessStorage({ rootHandle })` over a union-typed generic factory; names are illustrative until the neutral contract is designed.

Before extraction, settle lexical and symbolic-link containment, missing and permission errors, metadata fidelity, destructive-operation semantics, and atomicity. Keep absolute paths used by legacy consumers outside the neutral contract. Until those decisions are proven by more than one consumer, LiveSync-specific filesystem composition remains in `livesync-commonlib`, and Obsidian-specific Vault access remains in `@vrtmrz/obsidian-plugin-kit`.
