import assert from "node:assert/strict";
import test from "node:test";

import {
  assertKitDependencyIsPublished,
  assertVersionIsUnpublished,
  validateReleaseSelection,
} from "./validate-release-selection.mjs";

const sha = "a".repeat(40);
const base = {
  packageName: "@vrtmrz/ui-interactions",
  expectedVersion: "0.1.0-rc.0",
  distTag: "next",
  expectedSha: sha,
  actualSha: sha,
  confirmation: `stage @vrtmrz/ui-interactions@0.1.0-rc.0 from ${sha}`,
  manifest: { name: "@vrtmrz/ui-interactions", version: "0.1.0-rc.0" },
  lockEntry: { version: "0.1.0-rc.0" },
  uiManifest: { version: "0.1.0-rc.0" },
};

test("accepts an exact prerelease selection", () => {
  assert.equal(validateReleaseSelection(base).packageDirectory, "packages/ui-interactions");
});

test("accepts octagonal-wheels from its monorepo package directory", () => {
  const selection = {
    ...base,
    packageName: "octagonal-wheels",
    expectedVersion: "0.1.48-preview.0",
    confirmation: `stage octagonal-wheels@0.1.48-preview.0 from ${sha}`,
    manifest: { name: "octagonal-wheels", version: "0.1.48-preview.0" },
    lockEntry: { version: "0.1.48-preview.0" },
  };
  assert.equal(validateReleaseSelection(selection).packageDirectory, "packages/octagonal-wheels");
});

test("rejects every staged release sent to latest", () => {
  assert.throws(() => validateReleaseSelection({ ...base, distTag: "latest" }), /must use the next dist-tag/);
  assert.throws(
    () => validateReleaseSelection({
      ...base,
      expectedVersion: "0.1.0",
      distTag: "latest",
      confirmation: `stage @vrtmrz/ui-interactions@0.1.0 from ${sha}`,
      manifest: { name: "@vrtmrz/ui-interactions", version: "0.1.0" },
      lockEntry: { version: "0.1.0" },
      uiManifest: { version: "0.1.0" },
    }),
    /must use the next dist-tag/,
  );
});

test("rejects non-canonical or malformed release versions", () => {
  for (const expectedVersion of ["01.0.0", "0.1.0-01", "0.1.0-", "0.1.0-rc..0", "0.1"]) {
    assert.throws(() => validateReleaseSelection({ ...base, expectedVersion }), /Invalid semantic version/);
  }
});

test("requires the plug-in kit dependency and lockfile to match UI interactions", () => {
  const kit = {
    ...base,
    packageName: "@vrtmrz/obsidian-plugin-kit",
    confirmation: `stage @vrtmrz/obsidian-plugin-kit@0.1.0-rc.0 from ${sha}`,
    manifest: {
      name: "@vrtmrz/obsidian-plugin-kit",
      version: "0.1.0-rc.0",
      dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
    },
    lockEntry: { version: "0.1.0-rc.0", dependencies: { "@vrtmrz/ui-interactions": "0.1.0" } },
  };
  assert.throws(() => validateReleaseSelection(kit), /workspace contains 0.1.0-rc.0/);
});

test("distinguishes an unpublished registry version from registry failure", async () => {
  await assert.doesNotReject(assertVersionIsUnpublished("@vrtmrz/ui-interactions", "0.1.0", async () => ({ status: 404, ok: false })));
  await assert.rejects(assertVersionIsUnpublished("@vrtmrz/ui-interactions", "0.1.0", async () => ({ status: 503, ok: false })), /HTTP 503/);
  await assert.rejects(assertVersionIsUnpublished("@vrtmrz/ui-interactions", "0.1.0", async () => ({ status: 200, ok: true })), /already present/);
});

test("requires the plug-in kit UI version to exist on npm", async () => {
  const manifest = { dependencies: { "@vrtmrz/ui-interactions": "0.1.0" } };
  await assert.rejects(assertKitDependencyIsPublished("@vrtmrz/obsidian-plugin-kit", manifest, async () => ({ ok: false })), /must be published/);
  await assert.doesNotReject(assertKitDependencyIsPublished("@vrtmrz/obsidian-plugin-kit", manifest, async () => ({ ok: true })));
});
