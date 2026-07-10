# Contributing

## Language and documentation

Write source code, comments, tests, documentation, and user-facing default strings in English. Use British English in prose where there is a choice, while preserving official names, existing API identifiers, and conventional technical spellings.

Use sentence case for headings. Keep comments focused on intent, constraints, and non-obvious decisions.

Every exported API and option field requires useful TSDoc. Document contracts that types alone cannot express, such as defaults, cancellation sentinels, object identity, callback timing, terminal states, side effects, and lifecycle ownership.

## Tests

Add focused unit tests for every functional change.

For visible Obsidian UI behaviour:

1. add or update a showcase story;
2. add a real Obsidian E2E scenario when keyboard, focus, rendered DOM, theme, Modal, SuggestModal, or Notice behaviour matters;
3. keep scripted-driver tests separate from real UI coverage.

Use focused package commands while developing. Before handing off a repository-wide change, install the octagonal-wheels Chromium binary once and run the complete workspace gate:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
npm run verify:workspace
```

The gate checks and tests all four packages, builds all publishable artefacts and the showcase, and performs a dry-run pack of every workspace package. Changes confined to one package may use its workspace scripts during iteration, but the final validation should remain proportional to any affected dependants.

The workspace root pins `@emnapi/core` and `@emnapi/runtime` because npm can otherwise resolve the optional `@napi-rs/wasm-runtime` peers differently when creating and consuming the lockfile. Validate dependency changes with a clean `npm ci` before removing those pins.

When a local Obsidian executable and CLI are available, also run:

```bash
npm run test:e2e:obsidian:local-suite
```

## UI automation

Follow [the UI automation guide](packages/obsidian-plugin-kit/docs/ui-automation.md). Scripted responses must remain instance-scoped and must not be enabled through production settings, URI parameters, or other external input.

Keep neutral interaction contracts, driver dispatch, and App-free harnesses in `packages/ui-interactions`. Keep Obsidian Modal, SuggestModal, MarkdownRenderer, Notice, and `App` integration in `packages/obsidian-plugin-kit`.

Keep local real-Obsidian process, isolated-vault, CLI bootstrap, and CDP readiness infrastructure in `packages/obsidian-test-session`. Consumer stories, fixtures, settings, databases, and assertions remain consumer-owned.

Keep pure utilities and generic structural algorithms in `packages/octagonal-wheels`. Its history is connected as a non-squashed subtree; use `git subtree pull --prefix=packages/octagonal-wheels <octagonal-wheels-repository> main` when deliberately importing upstream changes.

See [the package architecture](docs/architecture.md) for dependency direction and [the release process](docs/releasing.md) before changing package versions or publishing.

## Changes and commits

Keep changes focused and separate unrelated refactors or generated output where practical. Use short, imperative English commit subjects, and describe behavioural compatibility and test evidence in pull requests.
