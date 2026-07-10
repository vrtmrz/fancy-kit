# Releasing packages

The workspace root and showcase are private. Publish only an explicitly selected package under `packages/`, and keep package versions independent.

## Release gate

Install the octagonal-wheels Chromium binary once, then run the complete gate from the repository root:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
npm run verify:workspace
```

Real Obsidian E2E is deliberately local-only. Run `npm run test:e2e:obsidian:local-suite` as an additional release check when a change affects Obsidian UI or the E2E runner.

Inspect the selected package's entry in the `pack:workspace` output. A scoped package tarball should contain its licence, README, compiled `dist` files and emitted maps, and package metadata only. The showcase, tests, private notes, and files outside the package manifest must not leak into it.

## Version and dependency order

Use a prerelease for the first consumer validation. Do not publish a `0.0.0` package.

`@vrtmrz/ui-interactions` must be versioned and published before a plug-in-kit release that depends on it. Update `@vrtmrz/obsidian-plugin-kit` to the exact intended published UI package version and refresh the root lockfile before packing the kit.

`@vrtmrz/obsidian-e2e-runner` is independent of the runtime packages and can be released separately. `octagonal-wheels` retains its existing version history and should be released only when its own public artefacts change.

## Publishing one package

After reviewing the version, lockfile, changelog or release notes, checks, and dry-run tarball, publish from the workspace root:

```bash
npm publish --workspace <package-name>
```

The scoped package manifests already request public access. Confirm the npm account, organisation access, package name availability, and authentication immediately before publishing. Publishing is an explicit external action and is never part of the normal build or CI workflow.

After publication, install the exact released version in one consumer, run its build and focused tests, and only then migrate additional consumers.
