# Releasing packages

This is the developer and maintainer runbook for validating and publishing workspace packages. Repository-specific agent authority and stopping rules belong in `AGENTS.md`.

The workspace root and showcase are private. Publish only an explicitly selected package under `packages/`, and keep package versions independent.

## Release gate

Install the octagonal-wheels Chromium binary once, then run the complete gate from the repository root:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
npm run verify:workspace
```

Real Obsidian E2E is deliberately local-only. Run `npm run test:e2e:obsidian:local-suite` as an additional release check when a change affects Obsidian UI or the test session package.

Current real-Obsidian validation covers Linux and macOS. Do not describe Windows as supported until the same smoke and lifecycle checks have been run successfully there.

Inspect the selected package's entry in the `pack:workspace` output. A scoped package tarball should contain its licence, README, compiled `dist` files and emitted maps, and package metadata only. The showcase, tests, private notes, and files outside the package manifest must not leak into it.

## Version and dependency order

Use a prerelease when consumer validation requires a registry version before the stable release. A compatible patch may instead be validated from an immutable local or CI-built tarball before staging the stable version under `next`. Do not publish a `0.0.0` package.

`@vrtmrz/ui-interactions` must be versioned and published before a plug-in-kit release that depends on it. Update `@vrtmrz/obsidian-plugin-kit` to the exact intended published UI package version and refresh the root lockfile before packing the kit.

`@vrtmrz/obsidian-test-session` is independent of the runtime packages and can be released separately. `octagonal-wheels` retains its existing version history and should be released only when its own public artefacts change.

Choose the version deliberately before preparing the release:

- use a patch version for compatible fixes, internal maintenance, and compatible additions;
- use the next minor version while the packages are in `0.x` when the public contract changes intentionally or consumers must review migration work;
- add a prerelease suffix, such as `-rc.0`, when registry Consumer validation must precede the stable version.

The preparation script does not infer the release level. It rejects unsupported packages, malformed versions, unchanged versions, an out-of-sync lockfile, and a plug-in-kit UI dependency that does not match the workspace.

## Preparing a release pull request

Create a release branch from the current `main`, then run the root preparation script with the exact package name and intended version:

```bash
git switch main
git pull --ff-only
git switch -c release-<short-package-name>-<version>
npm ci
npm run release:prepare -- <package-name> <version>
```

`release:prepare` updates the selected package manifest and its workspace lockfile entry together, then runs that package's `build` script. It deliberately does not commit, push, stage, approve, publish, or promote anything.

Review the resulting files before running the complete gate:

```bash
git status --short
git diff --check
npm run verify:workspace
```

The expected release preparation differs by package:

| Package | Preparation and order | Tracked release output | Additional consumer validation |
| --- | --- | --- | --- |
| `@vrtmrz/ui-interactions` | Release before a plug-in-kit version that requires it. | Manifest and root lockfile. Compiled `dist` is ignored. | Exercise the changed contracts through a harness and at least one consuming plug-in. Run the local Obsidian suite when visible UI behaviour changes. |
| `@vrtmrz/obsidian-plugin-kit` | Keep `@vrtmrz/ui-interactions` pinned to the exact intended published version. | Manifest and root lockfile. Compiled `dist` is ignored. | Build and test representative consuming plug-ins. Run the local Obsidian suite for adapter or visible UI changes. |
| `@vrtmrz/obsidian-test-session` | Independent of the runtime packages. | Manifest and root lockfile. Compiled `dist` is ignored. | Run the local Obsidian lifecycle suite on each platform whose support is claimed. |
| `octagonal-wheels` | Retains its independent version history. Release only when its public artefacts change. | Manifest, root lockfile, and any changed tracked files under `packages/octagonal-wheels/dist`. | Install the exact tarball in a relevant web application or plug-in. Use Self-hosted LiveSync when the changed API is consumed there. |

When a new UI interactions version is required by the plug-in kit, prepare and publish UI interactions first. Update the plug-in-kit dependency to that exact published version, refresh the lockfile, and only then prepare the plug-in-kit version.

Stage only the reviewed release files. For `octagonal-wheels`, use `git add -u` for already tracked build output because the general `dist` ignore rule remains in place:

```bash
git add package-lock.json packages/<package-directory>/package.json
git add -u packages/octagonal-wheels/dist
git commit -m "release: prepare <package-name> <version>"
git push -u origin release-<short-package-name>-<version>
gh pr create --draft --base main --title "Prepare <package-name> <version>"
```

Omit the `octagonal-wheels/dist` command for the scoped packages. The release pull request should state the version choice, package and consumer checks, tarball inspection, and any platform limits. Merge it before dispatching staged publishing; the workflow accepts exact commits on `main` only.

## GitHub consumer previews

Consumer previews are immutable GitHub prereleases for migration testing. They are not npm publications and must not run `npm publish`.

Build every tarball in one preview from the tagged commit. Attach only the explicitly selected workspace package tarballs and a `SHA256SUMS` file. Record the source commit, package list, validation performed, platform limits, and the consumer workflow that exercised the change in the release notes.

The unpublished scoped packages use their next intended `0.x` versions in a consumer preview; do not create new `0.0.0` artefacts. The GitHub release remains a prerelease even when those package manifests use `0.1.0`. An `octagonal-wheels` preview must use the next intended version with a prerelease suffix, such as `0.1.48-preview.0`, so its package metadata cannot be confused with the published stable release. Validate the preview in at least one consumer before staging the corresponding npm release.

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

## Initial npm bootstrap

An npm package must exist before npm Trusted Publishing or staged publishing can be configured. Bootstrap each new scoped package once from a reviewed release commit using an interactive npm session with 2FA. Do not put a temporary bypass token in GitHub Actions.

Use an `-rc.0` version and the `next` dist-tag for this one-off publication:

```bash
FANCY_KIT_BOOTSTRAP_PUBLISH=1 npm publish --workspace <package-name> --tag next --access public
```

Publish `@vrtmrz/ui-interactions` before `@vrtmrz/obsidian-plugin-kit`, and update the kit to depend on that exact UI release candidate. `@vrtmrz/obsidian-test-session` is independent. Confirm the authenticated npm account, `@vrtmrz` scope ownership, public-package permission, package name, packed contents, and target commit immediately before each command.

npm requires every package to have a `latest` dist-tag. For a package's first publication, the bootstrap release therefore receives `latest` even when `--tag next` is supplied, and npm will reject an attempt to remove that sole `latest` tag. This is expected for the initial release candidate. Leave both tags in place, and replace `latest` with the first reviewed stable release later.

The bootstrap release is deliberately a release candidate. Install its exact registry version in one consumer and run the consumer's build and focused tests before preparing a stable package version.

The scoped packages' `prepublishOnly` guard rejects routine manual publication and requires the explicit bootstrap environment variable shown above. It is a procedural safeguard rather than an npm access control: package access settings, 2FA, and the trusted staged workflow remain the security boundary.

## Trusted staged publishing

After a bootstrap package exists, configure its npm Trusted Publisher for:

- GitHub owner and repository: `vrtmrz/fancy-kit`;
- workflow file: `publish-npm.yml`;
- environment: `npm`;
- allowed action: staged publishing only.

Protect the GitHub `npm` environment with a required reviewer, and use a selected-branch policy that permits the `main` branch only. A 'protected branches only' environment policy permits every branch when the repository has no branch protection rules, so it is not a substitute for the explicit `main` policy.

After the trusted staged workflow has succeeded once, configure the npm package to require 2FA and disallow token publication. The workflow uses a GitHub-hosted runner, OIDC, and `npm stage publish`; it does not hold an npm token or publish directly.

Dispatch the workflow from an exact commit on `main`. Supply one package, its manifest version, the full commit SHA, and the confirmation value shown by the workflow. Every staged package uses the `next` dist-tag. The verification job runs the complete workspace gate, packs the selected package, records its checksum, and passes that immutable tarball to the protected staging job.

The equivalent GitHub CLI dispatch is:

```bash
sha=$(git rev-parse origin/main)
gh workflow run publish-npm.yml \
  --ref main \
  -f package=<package-name> \
  -f version=<version> \
  -f expected_sha="$sha" \
  -f confirmation="stage <package-name>@<version> from $sha"
```

After the protected GitHub environment has approved the stage job, inspect the staged entry with npm 11.15.0 or later:

```bash
npx --yes npm@11.18.0 stage list <package-name> --json
npx --yes npm@11.18.0 stage view <stage-id> --json
```

Approve only the reviewed stage ID. Approval publishes the package under `next`; it does not promote `latest`:

```bash
npx --yes npm@11.18.0 stage approve <stage-id>
```

Review the staged package on npm, download it when a final content comparison is useful, then approve it with 2FA. Keep both prerelease and stable versions on `next` during registry-based consumer validation. After the stable version passes that validation, promote it separately and interactively with `npm dist-tag add <package>@<version> latest`. Treat promotion as its own release operation; it is not implied by permission to stage or approve the package.

Staged publishing requires npm 11.15.0 or later and Node.js 22.14.0 or later. Trusted publishing automatically records provenance for these public packages from this public repository. See the npm documentation for [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) and [staged publishing](https://docs.npmjs.com/staged-publishing/).

After publication, install the exact released version in one consumer, run its build and focused tests, and only then migrate additional consumers or promote the stable version to `latest`.

## octagonal-wheels releases

`octagonal-wheels` is maintained in this monorepo while retaining its independent package version and release cadence. Its former standalone repository is a read-only signpost to Fancy Kit. Keep the package `repository.directory`, homepage, issue tracker, npm Trusted Publisher, and release workflow pointed at `packages/octagonal-wheels` here.

The package already exists on npm, so it does not need the interactive bootstrap used for a new package. Stage releases through `publish-npm.yml`, review them on npm, and approve them with 2FA like subsequent scoped-package releases.

The old standalone build copied package metadata into `dist`. Fancy Kit publishes from `packages/octagonal-wheels` with an explicit `files` list, so that copy step is obsolete. The workspace build and `npm pack --workspace octagonal-wheels` are the authoritative build and package-content checks.

## Testing unpublished package changes

An npm Git dependency targets this monorepo's private root package, not a selected workspace package. It also lacks the ignored scoped-package build output, so do not use the repository URL directly as an `npm install` specification.

For consumer testing before a changed package version is published, use one of these temporary flows:

1. build this repository and install the required `packages/<name>` directories through local `file:` dependencies;
2. in CI, check out an explicit commit SHA, build it, and install package directories from that checkout;
3. run `npm pack --workspace <package-name>` and install the generated tarball locally or from a controlled build artefact location.

When an unpublished plug-in-kit change depends on an unpublished UI interactions change, install both package directories or tarballs from the same Fancy Kit commit. Treat `@vrtmrz/obsidian-test-session` as a development dependency. Keep temporary filesystem dependencies out of long-lived branches unless the repository layout is part of the documented consumer build contract.
