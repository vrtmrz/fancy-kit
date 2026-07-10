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

Run before handing off a change:

```bash
npm run check:all
npm run test
npm run build
npm run build:showcase
```

When a local Obsidian executable and CLI are available, also run:

```bash
npm run test:e2e:obsidian:local-suite
```

## UI automation

Follow [the UI automation guide](packages/obsidian-plugin-kit/docs/ui-automation.md). Scripted responses must remain instance-scoped and must not be enabled through production settings, URI parameters, or other external input.

Keep neutral interaction contracts, driver dispatch, and App-free harnesses in `packages/ui-interactions`. Keep Obsidian Modal, SuggestModal, MarkdownRenderer, Notice, and `App` integration in `packages/obsidian-plugin-kit`.

## Changes and commits

Keep changes focused and separate unrelated refactors or generated output where practical. Use short, imperative English commit subjects, and describe behavioural compatibility and test evidence in pull requests.
