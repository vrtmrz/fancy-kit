# Vrtmrz plug-in toolkit

This private npm workspace develops small, independently publishable libraries for Obsidian plug-ins and their shared test fixtures.

## Packages

- [`@vrtmrz/obsidian-plugin-kit`](packages/obsidian-plugin-kit): reusable, testable Obsidian UI primitives.
- [`@vrtmrz/obsidian-e2e-runner`](packages/obsidian-e2e-runner): local real-Obsidian session, bootstrap, and binary preparation infrastructure.
- [`@vrtmrz/ui-interactions`](packages/ui-interactions): framework-neutral UI contracts, drivers, and an App-free consumer test harness.
- [`octagonal-wheels`](packages/octagonal-wheels): pure utilities and generic structural algorithms, imported with its existing history.

## Workspace applications

- [`obsidian-showcase`](apps/obsidian-showcase): a private interactive catalogue and real Obsidian E2E fixture.

## Development

```bash
npm run check:all
npm run test
npm run build
npm run build:showcase
```

The default commands above keep the plug-in kit feedback loop small. Validate the complete workspace, including octagonal-wheels, with:

```bash
npm run check:workspace
npm run test:workspace
```

The octagonal-wheels suite uses headless Chromium. Install its local Playwright browser once with:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
```

Real Obsidian E2E remains a local-only suite and is not a default CI gate:

```bash
npm run test:e2e:obsidian:install-appimage
npm run test:e2e:obsidian:local-suite
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for API documentation, test, and UI automation requirements.
