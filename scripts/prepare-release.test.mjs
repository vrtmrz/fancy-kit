import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildPreparedPackage,
  compareReleaseVersions,
  planReleasePreparation,
  planReleaseSetPreparation,
  prepareReleaseMetadata,
} from "./prepare-release.mjs";

function fixture(packageName = "octagonal-wheels") {
  const directories = {
    "@vrtmrz/ui-interactions": "packages/ui-interactions",
    "@vrtmrz/obsidian-plugin-kit": "packages/obsidian-plugin-kit",
    "@vrtmrz/obsidian-test-session": "packages/obsidian-test-session",
    "octagonal-wheels": "packages/octagonal-wheels",
  };
  const packageDirectory = directories[packageName];
  const dependencies = packageName === "@vrtmrz/obsidian-plugin-kit" ? { "@vrtmrz/ui-interactions": "0.1.0" } : undefined;
  return {
    packageName,
    version: "0.1.49",
    manifest: { name: packageName, version: "0.1.48", ...(dependencies ? { dependencies } : {}) },
    lockfile: {
      packages: {
        [packageDirectory]: {
          version: "0.1.48",
          ...(dependencies ? { dependencies: { ...dependencies } } : {}),
        },
      },
    },
    uiManifest: { name: "@vrtmrz/ui-interactions", version: "0.1.0" },
  };
}

test("updates the selected manifest and lockfile together", () => {
  const input = fixture();
  const result = planReleasePreparation(input);
  assert.equal(result.manifest.version, "0.1.49");
  assert.equal(result.lockfile.packages[result.packageDirectory].version, "0.1.49");
  assert.equal(input.manifest.version, "0.1.48");
  assert.equal(input.lockfile.packages[result.packageDirectory].version, "0.1.48");
});

test("accepts every publishable package", () => {
  for (const packageName of [
    "@vrtmrz/ui-interactions",
    "@vrtmrz/obsidian-plugin-kit",
    "@vrtmrz/obsidian-test-session",
    "octagonal-wheels",
  ]) {
    assert.doesNotThrow(() => planReleasePreparation(fixture(packageName)));
  }
});

test("rejects unsupported packages, malformed versions, and an unchanged version", () => {
  assert.throws(() => planReleasePreparation({ ...fixture(), packageName: "unknown" }), /Unsupported package/);
  assert.throws(() => planReleasePreparation({ ...fixture(), version: "0.1" }), /Invalid semantic version/);
  assert.throws(
    () => planReleasePreparation({ ...fixture(), manifest: { name: "octagonal-wheels", version: "0.1" } }),
    /Invalid current manifest version/,
  );
  assert.throws(() => planReleasePreparation({ ...fixture(), version: "0.1.48" }), /already version/);
  assert.throws(() => planReleasePreparation({ ...fixture(), version: "0.1.47" }), /must be greater/);
});

test("orders stable and prerelease versions using semantic-version precedence", () => {
  assert.ok(compareReleaseVersions("0.1.49", "0.1.49-rc.0") > 0);
  assert.ok(compareReleaseVersions("0.1.49-rc.1", "0.1.49-rc.0") > 0);
  assert.ok(compareReleaseVersions("0.1.49-rc.0", "0.1.49") < 0);
  assert.ok(compareReleaseVersions("0.2.0-preview.0", "0.1.49") > 0);
});

test("requires the manifest and lockfile versions to agree before preparation", () => {
  const input = fixture();
  input.lockfile.packages["packages/octagonal-wheels"].version = "0.1.47";
  assert.throws(() => planReleasePreparation(input), /does not match lockfile/);
});

test("requires the plug-in kit UI dependency to match the workspace and lockfile", () => {
  const workspaceMismatch = fixture("@vrtmrz/obsidian-plugin-kit");
  workspaceMismatch.uiManifest.version = "0.1.1";
  assert.throws(() => planReleasePreparation(workspaceMismatch), /workspace contains 0.1.1/);

  const lockMismatch = fixture("@vrtmrz/obsidian-plugin-kit");
  lockMismatch.lockfile.packages["packages/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"] = "0.0.9";
  assert.throws(() => planReleasePreparation(lockMismatch), /does not match the lockfile/);
});

test("prepares a coordinated UI and plug-in-kit release with one exact dependency", () => {
  const manifests = {
    "@vrtmrz/ui-interactions": {
      name: "@vrtmrz/ui-interactions",
      version: "0.1.0",
    },
    "@vrtmrz/obsidian-plugin-kit": {
      name: "@vrtmrz/obsidian-plugin-kit",
      version: "0.1.1",
      dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
    },
  };
  const lockfile = {
    packages: {
      "packages/ui-interactions": {
        name: "@vrtmrz/ui-interactions",
        version: "0.1.0",
      },
      "packages/obsidian-plugin-kit": {
        name: "@vrtmrz/obsidian-plugin-kit",
        version: "0.1.1",
        dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
      },
    },
  };

  const result = planReleaseSetPreparation({
    selections: [
      { packageName: "@vrtmrz/ui-interactions", version: "0.1.1" },
      { packageName: "@vrtmrz/obsidian-plugin-kit", version: "0.1.2" },
    ],
    manifests,
    lockfile,
  });

  assert.equal(result.manifests["@vrtmrz/ui-interactions"].version, "0.1.1");
  assert.equal(result.manifests["@vrtmrz/obsidian-plugin-kit"].version, "0.1.2");
  assert.equal(
    result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"],
    "0.1.1",
  );
  assert.equal(result.lockfile.packages["packages/ui-interactions"].version, "0.1.1");
  assert.equal(result.lockfile.packages["packages/obsidian-plugin-kit"].version, "0.1.2");
  assert.equal(
    result.lockfile.packages["packages/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"],
    "0.1.1",
  );
  assert.equal(manifests["@vrtmrz/ui-interactions"].version, "0.1.0");
  assert.equal(
    manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"],
    "0.1.0",
  );
});

test("builds only the selected workspace", () => {
  let invocation;
  buildPreparedPackage({
    repositoryRoot: "/repository",
    packageName: "octagonal-wheels",
    spawn: (command, args, options) => {
      invocation = { command, args, options };
      return { status: 0 };
    },
  });

  assert.match(invocation.command, /^npm(?:\.cmd)?$/);
  assert.deepEqual(invocation.args, ["run", "build", "--workspace", "octagonal-wheels"]);
  assert.equal(invocation.options.cwd, "/repository");
  assert.equal(invocation.options.stdio, "inherit");
});

test("reports a selected package build failure", () => {
  assert.throws(
    () => buildPreparedPackage({ packageName: "octagonal-wheels", spawn: () => ({ status: 2 }) }),
    /Build failed for octagonal-wheels with exit code 2/,
  );
});

test("writes the selected manifest and lockfile while preserving their indentation", (context) => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "fancy-kit-release-"));
  context.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));
  mkdirSync(join(repositoryRoot, "packages/octagonal-wheels"), { recursive: true });
  mkdirSync(join(repositoryRoot, "packages/ui-interactions"), { recursive: true });
  writeFileSync(
    join(repositoryRoot, "packages/octagonal-wheels/package.json"),
    `${JSON.stringify({ name: "octagonal-wheels", version: "0.1.48" }, null, 4)}\n`,
  );
  writeFileSync(
    join(repositoryRoot, "packages/ui-interactions/package.json"),
    `${JSON.stringify({ name: "@vrtmrz/ui-interactions", version: "0.1.0" }, null, 2)}\n`,
  );
  writeFileSync(
    join(repositoryRoot, "package-lock.json"),
    `${JSON.stringify({ packages: { "packages/octagonal-wheels": { version: "0.1.48" } } }, null, 2)}\n`,
  );

  prepareReleaseMetadata({ repositoryRoot, packageName: "octagonal-wheels", version: "0.1.49" });

  const manifestText = readFileSync(join(repositoryRoot, "packages/octagonal-wheels/package.json"), "utf8");
  const lockfile = JSON.parse(readFileSync(join(repositoryRoot, "package-lock.json"), "utf8"));
  assert.match(manifestText, /\n    "version": "0\.1\.49"/);
  assert.equal(lockfile.packages["packages/octagonal-wheels"].version, "0.1.49");
});
