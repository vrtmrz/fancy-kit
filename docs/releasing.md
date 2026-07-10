# Releasing packages

The workspace root and showcase are private. Publish only an explicitly selected package under `packages/`, and keep package versions independent.

## Release gate

Install the octagonal-wheels Chromium binary once, then run the complete gate from the repository root:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
npm run verify:workspace
```

Real Obsidian E2E is deliberately local-only. Run `npm run test:e2e:obsidian:local-suite` as an additional release check when a change affects Obsidian UI or the test session package.

Current real-Obsidian validation covers Linux only. Do not describe macOS or Windows as supported until the same smoke and lifecycle checks have been run successfully on those platforms.

Inspect the selected package's entry in the `pack:workspace` output. A scoped package tarball should contain its licence, README, compiled `dist` files and emitted maps, and package metadata only. The showcase, tests, private notes, and files outside the package manifest must not leak into it.

## Version and dependency order

Use a prerelease for the first consumer validation. Do not publish a `0.0.0` package.

`@vrtmrz/ui-interactions` must be versioned and published before a plug-in-kit release that depends on it. Update `@vrtmrz/obsidian-plugin-kit` to the exact intended published UI package version and refresh the root lockfile before packing the kit.

`@vrtmrz/obsidian-test-session` is independent of the runtime packages and can be released separately. `octagonal-wheels` retains its existing version history and should be released only when its own public artefacts change.

## GitHub consumer previews

Consumer previews are immutable GitHub prereleases for migration testing. They are not npm publications and must not run `npm publish`.

Build every tarball in one preview from the tagged commit. Attach only the explicitly selected workspace package tarballs and a `SHA256SUMS` file. Record the source commit, package list, validation performed, platform limits, and the consumer workflow that exercised the change in the release notes.

The unpublished scoped packages use their next intended `0.x` versions in a consumer preview; do not create new `0.0.0` artefacts. The GitHub release remains a prerelease even when those package manifests use `0.1.0`. An `octagonal-wheels` preview must use the next intended version with a prerelease suffix, such as `0.1.47-preview.0`, so its package metadata cannot be confused with the published stable release. Validate the preview in at least one consumer before replacing the prerelease version with the corresponding stable version.

Create the selected artefacts from the workspace root after the complete release gate. Always use a dedicated staging directory outside the repository so generated tarballs cannot be committed accidentally:

```bash
preview_dir=/tmp/fancy-kit-consumer-preview
mkdir -p "$preview_dir"
npm pack --workspace @vrtmrz/ui-interactions --pack-destination "$preview_dir"
npm pack --workspace @vrtmrz/obsidian-plugin-kit --pack-destination "$preview_dir"
npm pack --workspace @vrtmrz/obsidian-test-session --pack-destination "$preview_dir"
npm pack --workspace octagonal-wheels --pack-destination "$preview_dir"
```

Inspect the tarball contents and package metadata, generate checksums, then create a GitHub prerelease whose tag points at the exact commit used to build them. Keep consumers on the previous preview unless they need the new contract; packages in one consumer should use one preview tag when practical.

## Publishing one package

After reviewing the version, lockfile, changelog or release notes, checks, and dry-run tarball, publish from the workspace root:

```bash
npm publish --workspace <package-name>
```

The scoped package manifests already request public access. Confirm the npm account, organisation access, package name availability, and authentication immediately before publishing. Publishing is an explicit external action and is never part of the normal build or CI workflow.

After publication, install the exact released version in one consumer, run its build and focused tests, and only then migrate additional consumers.

## Consumption before publication

An npm Git dependency targets this monorepo's private root package, not a selected workspace package. It also lacks the ignored scoped-package build output, so do not use the repository URL directly as an `npm install` specification.

During migration, use one of these temporary flows:

1. build this repository and install the required `packages/<name>` directories through local `file:` dependencies;
2. in CI, check out an explicit commit SHA, build it, and install package directories from that checkout;
3. run `npm pack --workspace <package-name>` and install the generated tarball locally or from a controlled build artefact location.

Install `@vrtmrz/ui-interactions` alongside `@vrtmrz/obsidian-plugin-kit` until both have published versions. Treat `@vrtmrz/obsidian-test-session` as a development dependency. Keep temporary filesystem dependencies out of long-lived branches unless the repository layout is part of the documented consumer build contract.
