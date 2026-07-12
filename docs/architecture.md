# Package architecture

This repository contains four independently versioned packages and one private Obsidian showcase. Sharing a workspace does not make their APIs or release lifecycles inseparable.

## Dependency direction

```text
@vrtmrz/ui-interactions
          ↑
@vrtmrz/obsidian-plugin-kit  ──peer──> obsidian

octagonal-wheels             (independent shared utilities)

@vrtmrz/obsidian-test-session  ──peer──> playwright
          ↑ dev-time
consumer E2E suites and the private showcase
```

`@vrtmrz/ui-interactions` owns framework-neutral interaction contracts, dispatch, scripted drivers, transcripts, and the App-free harness. It must not import Obsidian or browser APIs.

`@vrtmrz/obsidian-plugin-kit` owns Obsidian-specific Modal, SuggestModal, MarkdownRenderer, Notice, focus, lifecycle, and focused Vault adapters. It may expose narrow path-based capabilities and App-free harnesses when they make Obsidian workflows injectable without claiming to be a cross-platform filesystem. It may depend on the neutral interaction package. It must not contain LiveSync domain behaviour.

`octagonal-wheels` owns reusable utilities and structural algorithms that do not express Obsidian UI or LiveSync domain policy. It retains its existing package name, history, version, browser-compatible modules, and independent release lifecycle.

`@vrtmrz/obsidian-test-session` is Node-only development infrastructure. It owns local Obsidian binary discovery and preparation, isolated vault and profile state, process lifecycle, CLI bootstrap, and Playwright/CDP readiness. It does not belong in a plug-in runtime bundle.

## Consumer ownership

Consumers own their settings, fixtures, databases, synchronisation workflows, showcase stories, and assertions. The test session package returns `cliEnv` and `remoteDebuggingPort` so a consumer can perform domain-specific CLI or renderer operations without adding those operations to the shared package.

LiveSync replication, database, storage, and platform-neutral service contracts remain in `livesync-commonlib`. Only reusable Obsidian adapters belong in the plug-in kit.

## Import rules

- Import another workspace package through its npm package name, never through a sibling `src` path.
- Keep `obsidian` and `playwright` as peer dependencies at their respective integration boundaries.
- Keep scripted UI state instance-scoped. Do not add static response queues or module-global drivers.
- Preserve explicit `null` cancellation semantics when migrating a consumer.
- Build and pack packages before relying on their declarations or export maps from another repository.
- Preserve focused imports and `sideEffects: false`. Packed-consumer verification bundles the App-free testing entry and a root-level named Vault import to ensure unrelated Obsidian feature modules do not remain in consumer output.
- Keep scripted steps discriminated by interaction kind so callbacks receive the matching request type and automated results are checked before runtime validation.
- Keep the complete `UiInteractions` adapter at the consumer composition root. Workflows that use a subset should define a local, application-named `Pick<UiInteractions, ...>` capability rather than adding consumer policy groupings to this package.

## Private workspace applications

`apps/obsidian-showcase` is a visual catalogue and a real-Obsidian fixture. `test/e2e-obsidian` owns its stories and assertions while consuming the shared test session package. Neither directory is published.

## UI composition roles

Keep the three UI roles distinct:

- `UiInteractions` is the neutral capability accepted by an application workflow;
- `createObsidianUi` creates the concrete Obsidian adapter at the consumer composition root; and
- `UiInteractionDriver` is an optional, instance-scoped interceptor used to observe a request, provide a scripted response, or pass the request to the adapter.

The driver is not a platform abstraction and does not select a runtime platform. A future platform implementation can satisfy `UiInteractions` without changing workflow code or extending the Obsidian plug-in kit. Preserve focused direct imports for simple Obsidian UI code, keep scripted state instance-scoped, and keep cross-platform behaviour outside the plug-in kit.
