# Releasing packages

This is the developer and maintainer runbook for validating and publishing workspace packages. Repository-specific agent authority and stopping rules belong in `AGENTS.md`.

The workspace root and Harness application are not published to npm. Publish to npm only an explicitly selected package under `packages/`, and keep package versions independent. Fancy Kit Harness has a separate GitHub release and verified web-installer flow described below.

## Release gate

Install the octagonal-wheels Chromium binary once, then run the complete gate from the repository root:

```bash
npm exec --workspace octagonal-wheels -- playwright install chromium
npm run verify:workspace
```

Real Obsidian E2E is deliberately local-only. Run `npm run test:e2e:obsidian:local-suite` as an additional release check when a change affects Obsidian UI or the test session package.

Current real-Obsidian validation covers Linux and macOS. Do not describe Windows as supported until the same smoke and lifecycle checks have been run successfully there.

Inspect the selected package's entry in the `pack:workspace` output. A scoped package tarball should contain its licence, README, compiled `dist` files and emitted maps, and package metadata only. The harness, tests, private notes, and files outside the package manifest must not leak into it.

## Version and dependency order

Choose a prerelease only when a separately versioned candidate is useful. A stable version may be validated from an immutable local or CI-built tarball before staging under `latest`, or staged under `next` for registry-based validation before promotion of that same version to `latest`. Neither path requires an RC. Do not publish a `0.0.0` package; staging validation rejects that development version.

`@vrtmrz/ui-interactions` must be versioned and published before a browser-kit or plug-in-kit release that depends on it. Update each selected adapter package to the exact intended published UI package version, and refresh the root lockfile before packing it.

`@vrtmrz/value-store` is an independent core with no runtime, peer, or optional dependencies; version 0.1.0 is published. Pin the exact intended published version in its consumers. An independent ValueStore release does not require a dependent package release. `@vrtmrz/secret-store` depends on ValueStore for shared operations and errors, while the plug-in kit and `@vrtmrz/secret-store-node` depend on ValueStore directly as well. Publish and validate ValueStore before SecretStore, then publish SecretStore before the plug-in kit or Node adapter versions which require it. The Node package also depends on the pinned age implementation. Browser-kit and UI-only selections remain independent of these packages.

`@vrtmrz/value-store` owns the shared asynchronous string and JSON-object operations, explicit deletion, and the Web Storage and Node JSON-file adapters. Its package has no runtime, peer, or optional dependencies, so it can be selected independently. When a ValueStore version is selected, preparation aligns its direct workspace consumers with that version and orders ValueStore first among selected releases. Unselected consumers retain their own versions and are not added to the release selection.

`@vrtmrz/obsidian-test-session` is independent of the runtime packages and can be released separately. `octagonal-wheels` retains its existing version history and should be released only when its own public artefacts change.

Record pending user-visible `octagonal-wheels` changes under `Unreleased` in `packages/octagonal-wheels/updates.md`. During stable release preparation, replace that heading with the release version and add a new empty `Unreleased` section above it. Consumer previews may retain the `Unreleased` heading until the stable version is chosen.

Choose the version deliberately before preparing the release:

- use a patch version for compatible fixes, internal maintenance, and compatible additions;
- use the next minor version while the packages are in `0.x` when the public contract changes intentionally or consumers must review migration work;
- add a prerelease suffix, such as `-rc.0`, only when a separately versioned candidate is useful; a stable version on `next` can also support registry-based validation.

The preparation script does not infer the release level. It rejects unsupported packages, malformed versions, unchanged versions, an out-of-sync lockfile, and a selected package dependency that does not exactly match its workspace package. It accepts multiple package/version pairs when a reviewed source change crosses workspace package boundaries. Preparation updates direct workspace consumers of selected UI interactions, ValueStore, and SecretStore versions, including consumers which are not selected for release, and updates their lockfile entries together. This keeps a clean workspace install on the intended local packages. Only selected packages receive new versions and build or release selections; unrelated dependencies, including the Node adapter's pinned age implementation, remain unchanged. Selected packages are prepared in dependency order, and staging verifies that each selected package dependency is already published.

## Preparing a release pull request

Create a release branch from the current `main`, then run the root preparation script with the exact package name and intended version:

```bash
git switch main
git pull --ff-only
git switch -c release-<short-package-name>-<version>
npm ci
npm run build
npm run release:prepare -- <package-name> <version>
```

The root build generates the declarations needed from workspace dependencies, including those not selected for release. It does not change package versions or the release selection.

`release:prepare` updates selected versions, their direct workspace consumers' dependency pins, and the corresponding lockfile entries together, then runs each selected package's `build` script. Review dependent manifest changes even when those packages are not being released. The command does not commit, push, stage, approve, publish, or promote anything.

When browser-kit or plug-in-kit source requires a new UI interactions contract, prepare the affected runtime packages as one metadata set:

```bash
git switch -c release-runtime-packages-<ui-version>-<kit-version>
npm run release:prepare -- \
  @vrtmrz/ui-interactions <ui-version> \
  @vrtmrz/browser-ui-kit <browser-kit-version> \
  @vrtmrz/obsidian-plugin-kit <kit-version>
```

Omit an adapter which does not consume the changed contract. This prevents a packed consumer from resolving an adapter against an older nested UI package while the consumer imports the new top-level UI package. Keep npm publication sequential even though the metadata is reviewed together: stage, publish, and validate UI interactions first, then stage and publish each selected adapter from the same exact main commit. Each stage, approval, publication, and dist-tag promotion remains a separate operation.

Review the resulting files before running the complete gate:

```bash
git status --short
git diff --check
npm run verify:workspace
```

The expected release preparation differs by package:

| Package | Preparation and order | Tracked release output | Additional consumer validation |
| --- | --- | --- | --- |
| `@vrtmrz/secret-store` | Pin the exact published `@vrtmrz/value-store` version. Publish ValueStore first, then SecretStore before selected plugin or Node adapters. | Manifest, direct consumers' dependency pins, and root lockfile. Compiled `dist` is ignored. | Run secret-profile contract cases and packed type, runtime, and browser-bundle checks. Consumer composition and each platform adapter require their own evidence. |
| `@vrtmrz/secret-store-node` | Pin exact published ValueStore and SecretStore versions, and the reviewed age dependency. Publish both cores first. | Manifest and root lockfile. Compiled `dist` is ignored. | Run real filesystem and injected failure tests, native age/rage interoperability, and installed-tarball checks on the Node versions and filesystems claimed. Qualify deployment ownership separately. |
| `@vrtmrz/value-store` | Select its first release explicitly. It has no runtime, peer, or optional dependencies; publish before SecretStore or adapters that require it. | Manifest, direct consumers' dependency pins, and root lockfile. Consumer versions remain unchanged unless selected. Compiled `dist` is ignored. | Check the asynchronous string/object contract, explicit deletion, standalone offline installation, and neutral, Web Storage, and Node entry boundaries in packed consumers; qualify Node filesystem behaviour and Obsidian host composition against the claimed runtimes. |
| `@vrtmrz/ui-interactions` | Release before a browser-kit or plug-in-kit version that requires it. | Manifest, direct consumers' dependency pins, and root lockfile. Compiled `dist` is ignored. | Exercise the changed contracts through scripted tests and at least one maintained consumer. Run the local Obsidian suite when visible Obsidian UI behaviour changes. |
| `@vrtmrz/browser-ui-kit` | Keep `@vrtmrz/ui-interactions` pinned to the exact intended published version. | Manifest and root lockfile. Compiled `dist` is ignored. | Build and test representative browser consumers, including native DOM interaction and notification paths. |
| `@vrtmrz/obsidian-plugin-kit` | Pin `@vrtmrz/ui-interactions`, `@vrtmrz/secret-store`, and `@vrtmrz/value-store` to their exact intended published versions. Publish each required dependency first. | Manifest and root lockfile. Compiled `dist` is ignored. | Build and test representative consuming plug-ins. Run the local Obsidian suite for adapter or visible UI changes. |
| `@vrtmrz/obsidian-test-session` | Independent of the runtime packages. | Manifest and root lockfile. Compiled `dist` is ignored. | Run the local Obsidian lifecycle suite on each platform whose support is claimed. |
| `octagonal-wheels` | Retains its independent version history. Release only when its public artefacts change. | Manifest, root lockfile, and any changed tracked files under `packages/octagonal-wheels/dist`. | Install the exact tarball in a relevant web application or plug-in. Use Self-hosted LiveSync when the changed API is consumed there. |

When a new UI interactions version is required by adapter source, use the coordinated preparation command above. If neither adapter consumes the changed contract, a UI-only release remains valid. Otherwise, publish and validate UI interactions before publishing either adapter. When a release changes ValueStore, prepare it together with any selected direct consumers, then stage packages in dependency order: ValueStore, SecretStore, and each selected adapter. Packages which do not consume the changed contract remain valid independent selections.

Stage only the reviewed release files. Include the root lockfile and every manifest changed by preparation, including dependency-pin updates in consumers which are not selected for release. List each reviewed path explicitly. For example, preparing ValueStore alone requires:

```bash
git add package-lock.json packages/value-store/package.json \
  packages/secret-store/package.json \
  packages/secret-store-node/package.json \
  packages/obsidian-plugin-kit/package.json
```

For other release selections, use the manifest paths changed by that preparation. For `octagonal-wheels`, also stage already tracked build output with `git add -u` because the general `dist` ignore rule remains in place:

```bash
git add -u packages/octagonal-wheels/dist
```

Review the complete staged diff before committing:

```bash
git diff --cached --check
git diff --cached
git commit -m "release: prepare <package-name> <version>"
git push -u origin release-<short-package-name>-<version>
gh pr create --draft --base main --title "Prepare <package-name> <version>"
```

The release pull request should state the version choice, package and consumer checks, tarball inspection, and any platform limits. Merge it before dispatching staged publishing; the workflow accepts exact commits on `main` only.

For a coordinated runtime-package release, name every selected package and version in the commit and pull request. Consumer dependency-pin updates do not add those packages to the release selection. Do not dispatch a combined npm publication: the staged workflow continues to select and publish exactly one package per run.

## Repository snapshot releases

Repository snapshot releases mark reviewed, repository-wide milestones independently of every workspace package and Fancy Kit Harness version. They are normal GitHub Releases with tags in the form `fancy-kit-YYYY.MM.DD.N`, where the final positive integer distinguishes multiple snapshots on one date. GitHub selects the newest normal release as the repository's Latest release; this is the intended repository-wide signal. Repository snapshots do not publish packages, build Harness assets, or imply that independently versioned components have changed.

Dispatch `publish-repository-snapshot.yml` from an exact commit on `main`. The workflow validates a real calendar date, a full lowercase commit SHA, the selected Git ref, and an exact confirmation before creating the tag and release. Dispatch publishes the release immediately after verification, so treat starting the workflow as approval to publish the selected repository state and to notify any external services connected to GitHub Releases.

Review the selected commit and its completed CI evidence, then dispatch the workflow with a date-based version:

```bash
sha=$(git rev-parse origin/main)
version=YYYY.MM.DD.N
gh workflow run publish-repository-snapshot.yml \
  --ref main \
  -f version="$version" \
  -f expected_sha="$sha" \
  -f confirmation="release fancy-kit@$version from $sha"
```

The release captures the GitHub-generated source archive for the exact tagged commit. Create a snapshot only for a meaningful repository milestone; routine merges, package-only version preparation, and CI runs do not require one.

## GitHub consumer previews

Consumer previews are immutable GitHub prereleases for migration testing. They are not npm publications and must not run `npm publish`.

Build every tarball in one preview from the tagged commit. Attach only the explicitly selected workspace package tarballs and a `SHA256SUMS` file. Record the source commit, package list, validation performed, platform limits, and the consumer workflow that exercised the change in the release notes.

The unpublished scoped packages use their next intended `0.x` versions in a consumer preview; do not create new `0.0.0` artefacts. The GitHub release remains a prerelease even when those package manifests use `0.1.0`. An `octagonal-wheels` preview must use the next intended version with a prerelease suffix, such as `0.1.48-preview.0`, so its package metadata cannot be confused with the published stable release. Validate the preview in at least one consumer before staging the corresponding npm release.

Create the selected artefacts from the workspace root after the complete release gate. Always use a dedicated staging directory outside the repository so generated tarballs cannot be committed accidentally:

```bash
preview_dir=/tmp/fancy-kit-consumer-preview
mkdir -p "$preview_dir"
npm pack --workspace @vrtmrz/ui-interactions --pack-destination "$preview_dir"
npm pack --workspace @vrtmrz/browser-ui-kit --pack-destination "$preview_dir"
npm pack --workspace @vrtmrz/obsidian-plugin-kit --pack-destination "$preview_dir"
npm pack --workspace @vrtmrz/obsidian-test-session --pack-destination "$preview_dir"
npm pack --workspace octagonal-wheels --pack-destination "$preview_dir"
```

Inspect the tarball contents and package metadata, generate checksums, then create a GitHub prerelease whose tag points at the exact commit used to build them. Keep consumers on the previous preview unless they need the new contract; packages in one consumer should use one preview tag when practical.

## Fancy Kit Harness releases

Fancy Kit Harness is not an npm package. Its source and manifest live under `apps/obsidian-harness`, and its version remains independent from all workspace package versions. A release uses the tag `harness-<version>` in this repository and attaches a versioned Screwdriver document.

Update `apps/obsidian-harness/manifest.json` and `apps/obsidian-harness/versions.json` together. Run the relevant unit and local real-Obsidian scenarios while developing. Neither the complete local suite nor a full physical mobile review is a strict release gate; run the checks relevant to the change and record the available evidence.

After the reviewed source change is committed, rebuild the release assets from that clean commit:

```bash
npm run verify:workspace
npm run test:e2e:obsidian:local-suite
npm run release:prepare:harness
```

Inspect `dist/fancy-kit-harness/SOURCE.json` and require `includesUncommittedChanges` to be `false`. Verify all entries in `SHA256SUMS`. The generated `INSTALLER.md` contains the exact HTTPS link for the release body; its query identifies the Harness version and Screwdriver-document SHA-256, but never a Vault name.

Create the `harness-<version>` release as a GitHub prerelease at the exact source commit. This keeps the repository snapshot as the Latest normal release. Attach at least the versioned Screwdriver document, `SOURCE.json`, and `SHA256SUMS`; the individual plug-in files may also be attached for inspection. Include the generated installer link in the release body. Attach all assets before publishing when possible.

Publishing or editing the release triggers the Pages workflow. It copies every published Harness Screwdriver asset into a versioned same-origin path and deploys the installer. Wait for the **Deploy Harness installer** workflow, then open the release link and verify the complete Clipboard, Obsidian URI, Screwdriver restore, plug-in enablement, and selected review flow on the intended device. If the release was published before its asset was attached, add the asset and rerun the Pages workflow manually.

GitHub Pages must use **GitHub Actions** as its publishing source. The installer remembers the user-entered Vault name or ID in that browser under `fancy-kit-harness.vault-name`; the initial value is `fancy-kit-harness`. The Vault value does not enter release metadata or network requests.

The release tag and manifest version must match. Do not publish the Harness to npm, treat a package release as an implied Harness release, or make the Pages cache authoritative. The Fancy Kit source commit and its release assets remain authoritative.

## Initial npm staged publication

Stage the first release of each new scoped package from a reviewed release commit on `main` with an authenticated npm CLI session that has publish access to the `@vrtmrz` scope. Use npm CLI 11.15.0 or later with Node.js 22.14.0 or later. Staging and publication are separate operations: staging a new package creates a public `0.0.0-stage` placeholder, while the candidate version and its contents remain private until a maintainer reviews and approves the stage. `npm stage publish` does not require 2FA; approving the stage does.

Pack the selected package once, inspect the archive and metadata, record its SHA-256, and stage that exact tarball:

```bash
stage_dir=/tmp/fancy-kit-npm-stage
mkdir -p "$stage_dir"
npm pack --workspace <package-name> --pack-destination "$stage_dir"
tarball="$stage_dir/<generated-tarball-name>"
sha256sum "$tarball"
npm stage publish "$tarball" --tag next --access public
```

Use `next` when registry-based consumer validation must precede promotion to `latest`, regardless of whether the selected package version is stable or a prerelease. After reviewing the staged entry and its checksum, approve it separately with `npm stage approve <stage-id>`. Install the exact published version in a relevant consumer and run its build and focused tests. Once a stable version passes those checks, promote that same version to `latest` in a separate operation with `npm dist-tag add <package>@<version> latest`. A release candidate is optional when the selected stable version can be validated this way.

Release `@vrtmrz/ui-interactions` before `@vrtmrz/browser-ui-kit` or `@vrtmrz/obsidian-plugin-kit`, and update each adapter to depend on that exact published UI version. Release `@vrtmrz/value-store` before `@vrtmrz/secret-store`, then SecretStore before a plug-in-kit or `@vrtmrz/secret-store-node` release that requires it. Adapters can then be released independently. `@vrtmrz/obsidian-test-session` is independent. Confirm the authenticated npm account, scope ownership, public-package permission, package name, packed contents, checksum, and target commit immediately before staging.

The scoped packages' `prepublishOnly` guard rejects source-directory publication, including when the former `FANCY_KIT_BOOTSTRAP_PUBLISH=1` flag is set. It is a procedural safeguard; use `npm stage publish` with the verified tarball for a new package's first release, then use the protected workflow below for subsequent releases.

## Trusted staged publishing

After a package's first staged version has been approved and published, configure its npm Trusted Publisher for:

- GitHub owner and repository: `vrtmrz/fancy-kit`;
- workflow file: `publish-npm.yml`;
- environment: `npm`;
- allowed action: staged publishing only.

Protect the GitHub `npm` environment with a required reviewer, and use a selected-branch policy that permits the `main` branch only. A 'protected branches only' environment policy permits every branch when the repository has no branch protection rules, so it is not a substitute for the explicit `main` policy.

After the trusted staged workflow has succeeded once, configure the npm package to require 2FA and disallow token publication. The workflow uses a GitHub-hosted runner, OIDC, and `npm stage publish`; it does not hold an npm token or publish directly.

Dispatch the workflow from an exact commit on `main`. Supply one package, its manifest version, the selected dist-tag, the full commit SHA, and the confirmation value shown by the workflow. The `dist_tag` input defaults to `next`. Choose `latest` for a stable version whose relevant consumer checks have already passed against an immutable local or CI-built tarball; prereleases must use `next`. The confirmation must name the selected tag as well as the package, version, and commit. The verification job runs the complete workspace gate, packs the selected package, records its checksum, and passes that immutable tarball to the protected staging job.

The equivalent GitHub CLI dispatch is:

```bash
sha=$(git rev-parse origin/main)
dist_tag=latest
gh workflow run publish-npm.yml \
  --ref main \
  -f package=<package-name> \
  -f version=<version> \
  -f dist_tag="$dist_tag" \
  -f expected_sha="$sha" \
  -f confirmation="stage <package-name>@<version> to $dist_tag from $sha"
```

After a stage has been submitted, inspect the staged entry with npm 11.15.0 or later:

```bash
npx --yes npm@11.18.0 stage list <package-name> --json
npx --yes npm@11.18.0 stage view <stage-id> --json
```

Before approval, inspect the stage ID, package, version, checksum, provenance, and dist-tag. A stage's tag is fixed when it is created. Approval with 2FA publishes the package under that selected tag: a `latest` stage becomes the default installed version immediately, while a `next` stage is available for registry-based consumer checks:

```bash
npx --yes npm@11.18.0 stage approve <stage-id>
```

Review the staged package on npm, download it when a final content comparison is useful, then approve it with 2FA. Keep versions on `next` when registry-based consumer validation remains outstanding. After a stable version passes that validation, promote it separately and interactively with `npm dist-tag add <package>@<version> latest`. A stable version staged under `latest` needs no separate promotion.

Staged publishing requires npm 11.15.0 or later and Node.js 22.14.0 or later. Trusted publishing automatically records provenance for these public packages from this public repository. See the npm documentation for [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) and [staged publishing](https://docs.npmjs.com/staged-publishing/).

After publication, verify the exact registry artefact and its selected dist-tag. For a release under `next`, install the exact released version in one consumer and run its build and focused tests before migrating additional consumers or promoting a stable version to `latest`. For a release under `latest`, complete the relevant consumer checks before staging and confirm that the published artefact matches the reviewed tarball.

## octagonal-wheels releases

`octagonal-wheels` is maintained in this monorepo while retaining its independent package version and release cadence. Its former standalone repository is a read-only signpost to Fancy Kit. Keep the package `repository.directory`, homepage, issue tracker, npm Trusted Publisher, and release workflow pointed at `packages/octagonal-wheels` here.

The package already exists on npm, so it uses the protected workflow directly and does not need the first-release interactive stage. Stage releases through `publish-npm.yml`, review them on npm, and approve them with 2FA like subsequent scoped-package releases.

The old standalone build copied package metadata into `dist`. Fancy Kit publishes from `packages/octagonal-wheels` with an explicit `files` list, so that copy step is obsolete. The workspace build and `npm pack --workspace octagonal-wheels` are the authoritative build and package-content checks.

## Testing unpublished package changes

An npm Git dependency targets this monorepo's private root package, not a selected workspace package. It also lacks the ignored scoped-package build output, so do not use the repository URL directly as an `npm install` specification.

For consumer testing before a changed package version is published, use one of these temporary flows:

1. build this repository and install the required `packages/<name>` directories through local `file:` dependencies;
2. in CI, check out an explicit commit SHA, build it, and install package directories from that checkout;
3. run `npm pack --workspace <package-name>` and install the generated tarball locally or from a controlled build artefact location.

When an unpublished browser-kit or plug-in-kit change depends on an unpublished UI interactions change, install the adapter and UI package directories or tarballs from the same Fancy Kit commit. Install each unpublished dependency with the adapter that consumes it: ValueStore with SecretStore and the plug-in kit, and SecretStore with the plug-in or Node adapter. Treat `@vrtmrz/obsidian-test-session` as a development dependency. Keep temporary filesystem dependencies out of long-lived branches unless the repository layout is part of the documented consumer build contract.
