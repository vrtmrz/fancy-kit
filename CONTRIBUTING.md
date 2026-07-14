# Contributing

## Language and documentation

Write source code, comments, tests, documentation, and user-facing default strings in English. Use British English in prose where there is a choice, while preserving official names, existing API identifiers, and conventional technical spellings.

Use sentence case for headings. Keep comments focused on intent, constraints, and non-obvious decisions.

Every exported API and option field requires useful TSDoc. Document contracts that types alone cannot express, such as defaults, cancellation sentinels, object identity, callback timing, terminal states, side effects, and lifecycle ownership.

## Tests

Add focused unit tests for every functional change.

For visible Obsidian UI behaviour:

1. add or update a harness showcase story;
2. add a real Obsidian E2E scenario when keyboard, focus, rendered DOM, theme, Modal, SuggestModal, or Notice behaviour matters;
3. keep scripted-driver tests separate from real UI coverage.

Use focused package commands while developing. Before handing off a repository-wide change, install the octagonal-wheels Chromium binary once and run the complete workspace gate:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
npm run verify:workspace
```

The gate checks and tests all four packages, builds all publishable artefacts and the harness, and performs a dry-run pack of every workspace package. Changes confined to one package may use its workspace scripts during iteration, but the final validation should remain proportional to any affected dependants.

Neutral packages own compile-time public API fixtures, reusable contract cases, App-free harnesses, operation-count assertions, and packed-consumer checks for the contracts they publish. Platform adapters and consumers own real filesystem, browser, Obsidian, permission, symbolic-link, and workflow integration coverage.

Treat operation counts as ordinary unit or contract assertions when a spy can detect unnecessary scans, reads, writes, or platform calls deterministically. Add a benchmark only when a change can plausibly affect algorithmic cost, a hot path, allocation or copying, I/O amplification, concurrency, start-up, or behaviour at realistic data volumes. Keep benchmarks separate from functional gates, use fixed unit-sized data sets and warm-up where practical, and prefer comparison with a recorded baseline over brittle absolute wall-clock limits.

The workspace root pins `@emnapi/core` and `@emnapi/runtime` because npm can otherwise resolve the optional `@napi-rs/wasm-runtime` peers differently when creating and consuming the lockfile. Validate dependency changes with a clean `npm ci` before removing those pins.

When a local Obsidian executable and CLI are available, also run:

```bash
npm run test:e2e:obsidian:local-suite
```

## UI automation

Follow [the UI automation guide](packages/obsidian-plugin-kit/docs/ui-automation.md). Scripted responses must remain instance-scoped and must not be enabled through production settings, URI parameters, or other external input.

Keep neutral interaction contracts, driver dispatch, and App-free harnesses in `packages/ui-interactions`. Keep Obsidian Modal, SuggestModal, MarkdownRenderer, Notice, and `App` integration in `packages/obsidian-plugin-kit`.

Keep local real-Obsidian process, isolated-vault, CLI bootstrap, CDP readiness, and generic layout inspection infrastructure in `packages/obsidian-test-session`. Consumer stories, fixtures, settings, databases, selectors, and domain-specific assertions remain consumer-owned.

Keep pure utilities and generic structural algorithms in `packages/octagonal-wheels`. Its history is connected as a non-squashed subtree; use `git subtree pull --prefix=packages/octagonal-wheels <octagonal-wheels-repository> main` when deliberately importing upstream changes.

See [the package architecture](docs/architecture.md) for dependency direction and [the release process](docs/releasing.md) before changing package versions or publishing.

## Changes and commits

Keep changes focused and separate unrelated refactors or generated output where practical. Use short, imperative English commit subjects, and describe behavioural compatibility and test evidence in pull requests.
