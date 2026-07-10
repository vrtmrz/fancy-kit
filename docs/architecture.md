# Package architecture

This repository contains four independently versioned packages and one private Obsidian showcase. Sharing a workspace does not make their APIs or release lifecycles inseparable.

## Dependency direction

```text
@vrtmrz/ui-interactions
          ↑
@vrtmrz/obsidian-plugin-kit  ──peer──> obsidian

octagonal-wheels             (independent shared utilities)

@vrtmrz/obsidian-e2e-runner  ──peer──> playwright
          ↑ dev-time
consumer E2E suites and the private showcase
```

`@vrtmrz/ui-interactions` owns framework-neutral interaction contracts, dispatch, scripted drivers, transcripts, and the App-free harness. It must not import Obsidian or browser APIs.

`@vrtmrz/obsidian-plugin-kit` owns Obsidian-specific Modal, SuggestModal, MarkdownRenderer, Notice, focus, and lifecycle adapters. It may depend on the neutral interaction package. It must not become a cross-platform abstraction layer or contain LiveSync domain behaviour.

`octagonal-wheels` owns reusable utilities and structural algorithms that do not express Obsidian UI or LiveSync domain policy. It retains its existing package name, history, version, browser-compatible modules, and independent release lifecycle.

`@vrtmrz/obsidian-e2e-runner` is Node-only development infrastructure. It owns local Obsidian binary discovery and preparation, isolated vault and profile state, process lifecycle, CLI bootstrap, and Playwright/CDP readiness. It does not belong in a plug-in runtime bundle.

## Consumer ownership

Consumers own their settings, fixtures, databases, synchronisation workflows, showcase stories, and assertions. The E2E runner returns `cliEnv` and `remoteDebuggingPort` so a consumer can perform domain-specific CLI or renderer operations without adding those operations to the shared package.

LiveSync replication, database, storage, and platform-neutral service contracts remain in `livesync-commonlib`. Only reusable Obsidian adapters belong in the plug-in kit.

## Import rules

- Import another workspace package through its npm package name, never through a sibling `src` path.
- Keep `obsidian` and `playwright` as peer dependencies at their respective integration boundaries.
- Keep scripted UI state instance-scoped. Do not add static response queues or module-global drivers.
- Preserve explicit `null` cancellation semantics when migrating a consumer.
- Build and pack packages before relying on their declarations or export maps from another repository.

## Private workspace applications

`apps/obsidian-showcase` is a visual catalogue and a real-Obsidian fixture. `test/e2e-obsidian` owns its stories and assertions while consuming the shared E2E runner. Neither directory is published.
