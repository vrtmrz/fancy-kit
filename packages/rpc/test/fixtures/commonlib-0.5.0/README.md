# Pinned Commonlib reference

Test-only bundle of Commonlib 0.5.0 at the revision in `manifest.json`.
Do not edit it as part of the new runtime. The manifest records original source
hashes, bundled helper hashes, compiler version, and output hashes. The only
host substitution is `compatGlobal = globalThis` for Node tests. Both source
licences are retained. The hand-written declaration exposes the tested API
subset, not a generated proof of complete API identity.

Normal tests need neither a Commonlib checkout nor network access. To deliberately
regenerate the fixture, from the Fancy Kit root run:

```sh
node packages/rpc/scripts/generateLegacyFixture.mjs <commonlib-checkout>
```

The checkout must contain the pinned commit and the recorded dependency version.
Review source/helper hashes as well as output changes; a version alone does not
prove identical installed bytes. Keep the reference independent of the new runtime.

`legacyBaseline.test.ts` is reference-to-reference harness calibration.
`p2pCompatibility.test.ts` supplies the actual candidate and tests both directions.
The package's file list excludes this test fixture from distribution.
