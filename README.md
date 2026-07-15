# Fancy Kit

This npm workspace develops small, independently publishable libraries for Obsidian plug-ins and their shared test fixtures.

The packages use independent `0.x` versions. Stable releases are available from npm through the default `latest` dist-tag. The workspace root and harness application are never published to npm.

## Packages

- [`@vrtmrz/obsidian-plugin-kit`](packages/obsidian-plugin-kit): reusable, testable Obsidian UI primitives. See its [usage guide](packages/obsidian-plugin-kit/docs/usage-guide.md) for consumer integration.
- [`@vrtmrz/obsidian-test-session`](packages/obsidian-test-session): local real-Obsidian session, bootstrap, and binary preparation infrastructure.
- [`@vrtmrz/ui-interactions`](packages/ui-interactions): framework-neutral UI contracts, drivers, and an App-free consumer test harness.
- [`octagonal-wheels`](packages/octagonal-wheels): pure utilities and generic structural algorithms, maintained here with its existing package and commit history.

## Workspace application

- [`Fancy Kit Harness`](apps/obsidian-harness): a public interactive catalogue, guided real-device contract runner, and real Obsidian E2E fixture. Reviewed Harness releases provide a verified web installer that creates a Screwdriver document in a dedicated test Vault; follow the link in the selected [GitHub release](https://github.com/vrtmrz/fancy-kit/releases).

## Development

For a quick feedback loop while changing the scoped packages or harness, run:

```bash
npm run check:all
npm run test
npm run build
npm run build:harness
```

Before handing off a repository-wide change, validate every package, including octagonal-wheels, and inspect every package tarball with:

```bash
npm run verify:workspace
```

The octagonal-wheels suite uses headless Chromium. Install its local Playwright browser once with:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
```

The equivalent individual whole-workspace commands are `check:workspace`, `test:workspace`, `build:workspace`, `build:harness`, and `pack:workspace`.

Real Obsidian E2E remains a local-only suite and is not a default CI gate:

```bash
npm run test:e2e:obsidian:install-appimage
npm run test:e2e:obsidian:local-suite
```

## Installation

Install only the packages that a project needs. The commands below use npm's normal compatible version ranges. For the current `0.x` versions, those ranges accept patch releases but not the next minor release. Commit the lockfile for repeatable installations; add `--save-exact` when every dependency upgrade must be reviewed explicitly, including release qualification:

```bash
npm install @vrtmrz/ui-interactions
npm install @vrtmrz/obsidian-plugin-kit
npm install octagonal-wheels
npm install -D @vrtmrz/obsidian-test-session
npm install -D playwright @types/node
```

The plug-in kit installs its matching UI interactions dependency automatically. The test session package is development tooling and should not be bundled into an Obsidian plug-in.

See [the package architecture](docs/architecture.md), [the release process](docs/releasing.md), and [CONTRIBUTING.md](CONTRIBUTING.md) for package boundaries, publishing order, API documentation, tests, and UI automation requirements.
