# Fancy Kit

This private npm workspace develops small, independently publishable libraries for Obsidian plug-ins and their shared test fixtures.

The scoped packages use independent `0.x` versions. Initial release candidates are published under the npm `next` dist-tag while consumer validation continues. The workspace root and showcase application are always private.

## Packages

- [`@vrtmrz/obsidian-plugin-kit`](packages/obsidian-plugin-kit): reusable, testable Obsidian UI primitives. See its [usage guide](packages/obsidian-plugin-kit/docs/usage-guide.md) for consumer integration.
- [`@vrtmrz/obsidian-test-session`](packages/obsidian-test-session): local real-Obsidian session, bootstrap, and binary preparation infrastructure.
- [`@vrtmrz/ui-interactions`](packages/ui-interactions): framework-neutral UI contracts, drivers, and an App-free consumer test harness.
- [`octagonal-wheels`](packages/octagonal-wheels): pure utilities and generic structural algorithms, maintained here with its existing package and commit history.

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

## Installing release candidates

Install the scoped packages from the `next` dist-tag during the initial review period:

```bash
npm install @vrtmrz/ui-interactions@next
npm install @vrtmrz/obsidian-plugin-kit@next
npm install -D @vrtmrz/obsidian-test-session@next playwright @types/node
```

Pin an exact version in a long-lived consumer branch. The plug-in kit declares an exact dependency on the matching UI interactions release.

## Consuming packages before registry publication

Do not install this monorepo directly from a Git URL. npm installs the private workspace root from a Git dependency; it does not select an individual package under `packages/`, and the ignored build artefacts for the scoped packages are not present in the Git checkout.

For local consumer migration, build this workspace and install the required package directories:

```bash
# In this repository:
npm run build

# In a consumer repository with this repository checked out as a sibling:
npm install ../fancy-kit/packages/ui-interactions
npm install ../fancy-kit/packages/obsidian-plugin-kit
npm install -D ../fancy-kit/packages/obsidian-test-session
```

Install both runtime packages when consuming the plug-in kit so its unpublished exact dependency on `@vrtmrz/ui-interactions@0.1.0` is satisfied locally. The test session package is a development dependency.

For another machine or CI, check out this repository at an explicit commit SHA, run `npm ci` and `npm run build`, then install the required package directories from that checkout. Alternatively, create package tarballs with `npm pack --workspace <package-name>` and install the resulting `.tgz` files. Do not commit machine-specific `file:` paths to a long-lived consumer branch unless every checkout deliberately uses the same repository layout.

See [the package architecture](docs/architecture.md), [the release process](docs/releasing.md), and [CONTRIBUTING.md](CONTRIBUTING.md) for package boundaries, publishing order, API documentation, tests, and UI automation requirements.
