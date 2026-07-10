# Vrtmrz plug-in toolkit

This private npm workspace develops small, independently publishable libraries for Obsidian plug-ins and their shared test fixtures.

The scoped packages are currently at `0.0.0` and have not yet been published. The workspace root and showcase application are always private.

## Packages

- [`@vrtmrz/obsidian-plugin-kit`](packages/obsidian-plugin-kit): reusable, testable Obsidian UI primitives.
- [`@vrtmrz/obsidian-e2e-runner`](packages/obsidian-e2e-runner): local real-Obsidian session, bootstrap, and binary preparation infrastructure.
- [`@vrtmrz/ui-interactions`](packages/ui-interactions): framework-neutral UI contracts, drivers, and an App-free consumer test harness.
- [`octagonal-wheels`](packages/octagonal-wheels): pure utilities and generic structural algorithms, imported with its existing history.

## Workspace applications

- [`obsidian-showcase`](apps/obsidian-showcase): a private interactive catalogue and real Obsidian E2E fixture.

## Development

For a quick feedback loop while changing the scoped packages or showcase, run:

```bash
npm run check:all
npm run test
npm run build
npm run build:showcase
```

Before handing off a repository-wide change, validate every package, including octagonal-wheels, and inspect every package tarball with:

```bash
npm run verify:workspace
```

The octagonal-wheels suite uses headless Chromium. Install its local Playwright browser once with:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
```

The equivalent individual whole-workspace commands are `check:workspace`, `test:workspace`, `build:workspace`, `build:showcase`, and `pack:workspace`.

Real Obsidian E2E remains a local-only suite and is not a default CI gate:

```bash
npm run test:e2e:obsidian:install-appimage
npm run test:e2e:obsidian:local-suite
```

See [the package architecture](docs/architecture.md), [the release process](docs/releasing.md), and [CONTRIBUTING.md](CONTRIBUTING.md) for package boundaries, publishing order, API documentation, tests, and UI automation requirements.
