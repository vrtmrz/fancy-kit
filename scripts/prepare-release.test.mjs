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
  prepareReleaseSetMetadata,
} from "./prepare-release.mjs";

function fixture(packageName = "octagonal-wheels") {
  const directories = {
    "@vrtmrz/ui-interactions": "packages/ui-interactions",
    "@vrtmrz/browser-ui-kit": "packages/browser-ui-kit",
    "@vrtmrz/obsidian-plugin-kit": "packages/obsidian-plugin-kit",
    "@vrtmrz/obsidian-test-session": "packages/obsidian-test-session",
    "@vrtmrz/secret-store": "packages/secret-store",
    "@vrtmrz/secret-store-node": "packages/secret-store-node",
    "@vrtmrz/local-storage": "packages/local-storage",
    "octagonal-wheels": "packages/octagonal-wheels",
  };
  const packageDirectory = directories[packageName];
  const dependencies =
    packageName === "@vrtmrz/obsidian-plugin-kit"
      ? {
          "@vrtmrz/ui-interactions": "0.1.0",
          "@vrtmrz/secret-store": "0.0.0",
          "@vrtmrz/local-storage": "0.0.0",
        }
      : packageName === "@vrtmrz/browser-ui-kit"
        ? { "@vrtmrz/ui-interactions": "0.1.0" }
        : packageName === "@vrtmrz/secret-store-node"
          ? { "@vrtmrz/secret-store": "0.0.0", "age-encryption": "0.3.1" }
          : undefined;
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
    secretStoreManifest: { name: "@vrtmrz/secret-store", version: "0.0.0" },
    localStorageManifest: { name: "@vrtmrz/local-storage", version: "0.0.0" },
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
    "@vrtmrz/browser-ui-kit",
    "@vrtmrz/obsidian-plugin-kit",
    "@vrtmrz/obsidian-test-session",
    "@vrtmrz/secret-store",
    "@vrtmrz/secret-store-node",
    "@vrtmrz/local-storage",
    "octagonal-wheels",
  ]) {
    assert.doesNotThrow(() => planReleasePreparation(fixture(packageName)));
  }
});

test("prepares local-storage independently without adding runtime dependencies", () => {
  const input = fixture("@vrtmrz/local-storage");
  const result = planReleasePreparation(input);
  assert.equal(result.packageDirectory, "packages/local-storage");
  assert.equal("dependencies" in result.manifest, false);
  assert.equal("dependencies" in result.lockfile.packages["packages/local-storage"], false);
});

test("prepares SecretStore from its unreleased version without adding runtime dependencies", () => {
  const input = fixture("@vrtmrz/secret-store");
  input.version = "0.1.0-rc.0";
  input.manifest.version = "0.0.0";
  input.lockfile.packages["packages/secret-store"].version = "0.0.0";
  const result = planReleasePreparation(input);
  assert.equal(result.packageDirectory, "packages/secret-store");
  assert.equal(result.manifest.version, "0.1.0-rc.0");
  assert.equal(result.lockfile.packages["packages/secret-store"].version, "0.1.0-rc.0");
  assert.equal("dependencies" in result.manifest, false);
  assert.equal("dependencies" in result.lockfile.packages["packages/secret-store"], false);
});

test("prepares the Node adapter with its exact core and age dependencies", () => {
  const input = fixture("@vrtmrz/secret-store-node");
  const result = planReleasePreparation(input);
  assert.equal(result.packageDirectory, "packages/secret-store-node");
  assert.equal(result.manifest.dependencies["@vrtmrz/secret-store"], "0.0.0");
  assert.equal(result.lockfile.packages["packages/secret-store-node"].dependencies["@vrtmrz/secret-store"], "0.0.0");
  assert.equal(result.manifest.dependencies["age-encryption"], "0.3.1");
  assert.equal(result.lockfile.packages["packages/secret-store-node"].dependencies["age-encryption"], "0.3.1");
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

test("requires each UI adapter dependency to match the workspace and lockfile", () => {
  for (const packageName of [
    "@vrtmrz/browser-ui-kit",
    "@vrtmrz/obsidian-plugin-kit",
  ]) {
    const workspaceMismatch = fixture(packageName);
    workspaceMismatch.uiManifest.version = "0.1.1";
    assert.throws(
      () => planReleasePreparation(workspaceMismatch),
      /workspace contains 0.1.1/,
    );

    const lockMismatch = fixture(packageName);
    lockMismatch.lockfile.packages[
      `packages/${packageName.slice("@vrtmrz/".length)}`
    ].dependencies["@vrtmrz/ui-interactions"] = "0.0.9";
    assert.throws(
      () => planReleasePreparation(lockMismatch),
      /does not match the lockfile/,
    );
  }
});

test("requires the plug-in local-storage dependency to match the workspace and lockfile", () => {
  const workspaceMismatch = fixture("@vrtmrz/obsidian-plugin-kit");
  workspaceMismatch.localStorageManifest.version = "0.0.1";
  assert.throws(
    () => planReleasePreparation(workspaceMismatch),
    /local-storage.*workspace contains 0.0.1/,
  );

  const lockMismatch = fixture("@vrtmrz/obsidian-plugin-kit");
  lockMismatch.lockfile.packages["packages/obsidian-plugin-kit"].dependencies[
    "@vrtmrz/local-storage"
  ] = "0.0.1";
  assert.throws(
    () => planReleasePreparation(lockMismatch),
    /local-storage dependency does not match the lockfile/,
  );
});

test("rejects missing and malformed plug-in local-storage pins", () => {
  const missing = fixture("@vrtmrz/obsidian-plugin-kit");
  delete missing.manifest.dependencies["@vrtmrz/local-storage"];
  delete missing.lockfile.packages["packages/obsidian-plugin-kit"].dependencies[
    "@vrtmrz/local-storage"
  ];
  delete missing.localStorageManifest;
  assert.throws(() => planReleasePreparation(missing), /@vrtmrz\/local-storage/);

  const malformed = fixture("@vrtmrz/obsidian-plugin-kit");
  malformed.manifest.dependencies["@vrtmrz/local-storage"] = "latest";
  malformed.lockfile.packages["packages/obsidian-plugin-kit"].dependencies[
    "@vrtmrz/local-storage"
  ] = "latest";
  malformed.localStorageManifest.version = "latest";
  assert.throws(() => planReleasePreparation(malformed), /@vrtmrz\/local-storage/);
});

test("rejects a missing plug-in SecretStore dependency and workspace manifest", () => {
  const input = fixture("@vrtmrz/obsidian-plugin-kit");
  delete input.manifest.dependencies["@vrtmrz/secret-store"];
  delete input.lockfile.packages["packages/obsidian-plugin-kit"].dependencies[
    "@vrtmrz/secret-store"
  ];
  delete input.secretStoreManifest;
  assert.throws(
    () => planReleasePreparation(input),
    /@vrtmrz\/secret-store/,
  );
});

test("rejects a non-version SecretStore pin even when workspace and lockfile match", () => {
  const input = fixture("@vrtmrz/obsidian-plugin-kit");
  input.manifest.dependencies["@vrtmrz/secret-store"] = "latest";
  input.lockfile.packages["packages/obsidian-plugin-kit"].dependencies[
    "@vrtmrz/secret-store"
  ] = "latest";
  input.secretStoreManifest.version = "latest";
  assert.throws(
    () => planReleasePreparation(input),
    /@vrtmrz\/secret-store/,
  );
});

test("requires the plug-in secret-store dependency to match the workspace and lockfile", () => {
  const workspaceMismatch = fixture("@vrtmrz/obsidian-plugin-kit");
  workspaceMismatch.secretStoreManifest.version = "0.0.1";
  assert.throws(
    () => planReleasePreparation(workspaceMismatch),
    /secret-store.*workspace contains 0.0.1/,
  );

  const lockMismatch = fixture("@vrtmrz/obsidian-plugin-kit");
  lockMismatch.lockfile.packages["packages/obsidian-plugin-kit"].dependencies[
    "@vrtmrz/secret-store"
  ] = "0.0.1";
  assert.throws(
    () => planReleasePreparation(lockMismatch),
    /SecretStore dependency does not match the lockfile/,
  );
});

test("requires the Node adapter's SecretStore dependency to match the workspace and lockfile", () => {
  const workspaceMismatch = fixture("@vrtmrz/secret-store-node");
  workspaceMismatch.secretStoreManifest.version = "0.0.1";
  assert.throws(
    () => planReleasePreparation(workspaceMismatch),
    /secret-store.*workspace contains 0.0.1/,
  );

  const lockMismatch = fixture("@vrtmrz/secret-store-node");
  lockMismatch.lockfile.packages["packages/secret-store-node"].dependencies[
    "@vrtmrz/secret-store"
  ] = "0.0.1";
  assert.throws(
    () => planReleasePreparation(lockMismatch),
    /SecretStore dependency does not match the lockfile/,
  );
});

test("rejects missing and malformed Node adapter SecretStore pins", () => {
  const missing = fixture("@vrtmrz/secret-store-node");
  delete missing.manifest.dependencies["@vrtmrz/secret-store"];
  delete missing.lockfile.packages["packages/secret-store-node"].dependencies[
    "@vrtmrz/secret-store"
  ];
  delete missing.secretStoreManifest;
  assert.throws(() => planReleasePreparation(missing), /@vrtmrz\/secret-store/);

  const malformed = fixture("@vrtmrz/secret-store-node");
  malformed.manifest.dependencies["@vrtmrz/secret-store"] = "latest";
  malformed.lockfile.packages["packages/secret-store-node"].dependencies[
    "@vrtmrz/secret-store"
  ] = "latest";
  malformed.secretStoreManifest.version = "latest";
  assert.throws(() => planReleasePreparation(malformed), /@vrtmrz\/secret-store/);
});

function coordinatedSecretStoreRelease() {
  const manifests = {
    "@vrtmrz/ui-interactions": {
      name: "@vrtmrz/ui-interactions",
      version: "0.1.0",
    },
    "@vrtmrz/secret-store": {
      name: "@vrtmrz/secret-store",
      version: "0.0.0",
    },
    "@vrtmrz/local-storage": {
      name: "@vrtmrz/local-storage",
      version: "0.0.0",
    },
    "@vrtmrz/obsidian-plugin-kit": {
      name: "@vrtmrz/obsidian-plugin-kit",
      version: "0.1.0",
      dependencies: {
        "@vrtmrz/ui-interactions": "0.1.0",
        "@vrtmrz/secret-store": "0.0.0",
        "@vrtmrz/local-storage": "0.0.0",
      },
    },
    "@vrtmrz/secret-store-node": {
      name: "@vrtmrz/secret-store-node",
      version: "0.1.0",
      dependencies: {
        "@vrtmrz/secret-store": "0.0.0",
        "age-encryption": "0.3.1",
      },
    },
  };
  const lockfile = {
    packages: {
      "packages/ui-interactions": { name: "@vrtmrz/ui-interactions", version: "0.1.0" },
      "packages/secret-store": { name: "@vrtmrz/secret-store", version: "0.0.0" },
      "packages/local-storage": { name: "@vrtmrz/local-storage", version: "0.0.0" },
      "packages/obsidian-plugin-kit": {
        name: "@vrtmrz/obsidian-plugin-kit",
        version: "0.1.0",
        dependencies: {
          "@vrtmrz/ui-interactions": "0.1.0",
          "@vrtmrz/secret-store": "0.0.0",
          "@vrtmrz/local-storage": "0.0.0",
        },
      },
      "packages/secret-store-node": {
        name: "@vrtmrz/secret-store-node",
        version: "0.1.0",
        dependencies: {
          "@vrtmrz/secret-store": "0.0.0",
          "age-encryption": "0.3.1",
        },
      },
    },
  };
  const selections = [
    { packageName: "@vrtmrz/obsidian-plugin-kit", version: "0.1.1" },
    { packageName: "@vrtmrz/secret-store-node", version: "0.1.1" },
    { packageName: "@vrtmrz/secret-store", version: "0.1.0-rc.0" },
  ];
  return { manifests, lockfile, selections };
}

test("updates selected SecretStore consumer pins for a coordinated core release", () => {
  const input = coordinatedSecretStoreRelease();
  const result = planReleaseSetPreparation(input);
  assert.equal(
    result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/secret-store"],
    "0.1.0-rc.0",
  );
  assert.equal(
    result.lockfile.packages["packages/obsidian-plugin-kit"].dependencies["@vrtmrz/secret-store"],
    "0.1.0-rc.0",
  );
  assert.equal(
    result.manifests["@vrtmrz/secret-store-node"].dependencies["@vrtmrz/secret-store"],
    "0.1.0-rc.0",
  );
  assert.equal(
    result.lockfile.packages["packages/secret-store-node"].dependencies["@vrtmrz/secret-store"],
    "0.1.0-rc.0",
  );
  assert.equal(result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"], "0.1.0");
  assert.equal(result.manifests["@vrtmrz/secret-store-node"].dependencies["age-encryption"], "0.3.1");
  assert.equal(result.lockfile.packages["packages/secret-store-node"].dependencies["age-encryption"], "0.3.1");
});

test("prepares SecretStore before selected consumers", () => {
  const result = planReleaseSetPreparation(coordinatedSecretStoreRelease());
  assert.deepEqual(
    result.preparations.map(({ packageName }) => packageName),
    ["@vrtmrz/secret-store", "@vrtmrz/secret-store-node", "@vrtmrz/obsidian-plugin-kit"],
  );
});

test("updates only selected SecretStore consumers in a coordinated release", () => {
  const nodeSelected = coordinatedSecretStoreRelease();
  nodeSelected.selections = [
    { packageName: "@vrtmrz/secret-store", version: "0.1.0-rc.0" },
    { packageName: "@vrtmrz/secret-store-node", version: "0.1.1" },
  ];
  const nodeResult = planReleaseSetPreparation(nodeSelected);
  assert.equal(
    nodeResult.manifests["@vrtmrz/secret-store-node"].dependencies["@vrtmrz/secret-store"],
    "0.1.0-rc.0",
  );
  assert.equal(
    nodeResult.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/secret-store"],
    "0.0.0",
  );

  const pluginSelected = coordinatedSecretStoreRelease();
  pluginSelected.selections = [
    { packageName: "@vrtmrz/secret-store", version: "0.1.0-rc.0" },
    { packageName: "@vrtmrz/obsidian-plugin-kit", version: "0.1.1" },
  ];
  const pluginResult = planReleaseSetPreparation(pluginSelected);
  assert.equal(
    pluginResult.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/secret-store"],
    "0.1.0-rc.0",
  );
  assert.equal(
    pluginResult.manifests["@vrtmrz/secret-store-node"].dependencies["@vrtmrz/secret-store"],
    "0.0.0",
  );
});

test("updates only the selected plugin local-storage pin and prepares storage first", () => {
  const input = coordinatedSecretStoreRelease();
  input.selections = [
    { packageName: "@vrtmrz/obsidian-plugin-kit", version: "0.1.1" },
    { packageName: "@vrtmrz/local-storage", version: "0.0.1" },
  ];
  const result = planReleaseSetPreparation(input);

  assert.deepEqual(
    result.preparations.map(({ packageName }) => packageName),
    ["@vrtmrz/local-storage", "@vrtmrz/obsidian-plugin-kit"],
  );
  assert.equal(
    result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/local-storage"],
    "0.0.1",
  );
  assert.equal(
    result.lockfile.packages["packages/obsidian-plugin-kit"].dependencies["@vrtmrz/local-storage"],
    "0.0.1",
  );
  assert.equal(result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"], "0.1.0");
  assert.equal(result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/secret-store"], "0.0.0");
  assert.equal(result.manifests["@vrtmrz/secret-store-node"].dependencies["@vrtmrz/secret-store"], "0.0.0");
  assert.equal(result.manifests["@vrtmrz/secret-store-node"].dependencies["age-encryption"], "0.3.1");
});

test("prepares coordinated UI and adapter releases with one exact dependency", () => {
  const manifests = {
    "@vrtmrz/ui-interactions": {
      name: "@vrtmrz/ui-interactions",
      version: "0.1.0",
    },
    "@vrtmrz/browser-ui-kit": {
      name: "@vrtmrz/browser-ui-kit",
      version: "0.1.0",
      dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
    },
    "@vrtmrz/obsidian-plugin-kit": {
      name: "@vrtmrz/obsidian-plugin-kit",
      version: "0.1.1",
      dependencies: {
        "@vrtmrz/ui-interactions": "0.1.0",
        "@vrtmrz/secret-store": "0.0.0",
        "@vrtmrz/local-storage": "0.0.0",
      },
    },
    "@vrtmrz/secret-store": {
      name: "@vrtmrz/secret-store",
      version: "0.0.0",
    },
    "@vrtmrz/local-storage": {
      name: "@vrtmrz/local-storage",
      version: "0.0.0",
    },
  };
  const lockfile = {
    packages: {
      "packages/ui-interactions": {
        name: "@vrtmrz/ui-interactions",
        version: "0.1.0",
      },
      "packages/browser-ui-kit": {
        name: "@vrtmrz/browser-ui-kit",
        version: "0.1.0",
        dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
      },
      "packages/obsidian-plugin-kit": {
        name: "@vrtmrz/obsidian-plugin-kit",
        version: "0.1.1",
        dependencies: {
          "@vrtmrz/ui-interactions": "0.1.0",
          "@vrtmrz/secret-store": "0.0.0",
          "@vrtmrz/local-storage": "0.0.0",
        },
      },
      "packages/secret-store": {
        name: "@vrtmrz/secret-store",
        version: "0.0.0",
      },
      "packages/local-storage": {
        name: "@vrtmrz/local-storage",
        version: "0.0.0",
      },
    },
  };

  const result = planReleaseSetPreparation({
    selections: [
      { packageName: "@vrtmrz/ui-interactions", version: "0.1.1" },
      { packageName: "@vrtmrz/browser-ui-kit", version: "0.1.1" },
      { packageName: "@vrtmrz/obsidian-plugin-kit", version: "0.1.2" },
    ],
    manifests,
    lockfile,
  });

  assert.equal(result.manifests["@vrtmrz/ui-interactions"].version, "0.1.1");
  assert.equal(result.manifests["@vrtmrz/browser-ui-kit"].version, "0.1.1");
  assert.equal(result.manifests["@vrtmrz/obsidian-plugin-kit"].version, "0.1.2");
  assert.equal(
    result.manifests["@vrtmrz/browser-ui-kit"].dependencies[
      "@vrtmrz/ui-interactions"
    ],
    "0.1.1",
  );
  assert.equal(
    result.manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"],
    "0.1.1",
  );
  assert.equal(result.lockfile.packages["packages/ui-interactions"].version, "0.1.1");
  assert.equal(result.lockfile.packages["packages/browser-ui-kit"].version, "0.1.1");
  assert.equal(result.lockfile.packages["packages/obsidian-plugin-kit"].version, "0.1.2");
  assert.equal(
    result.lockfile.packages["packages/browser-ui-kit"].dependencies[
      "@vrtmrz/ui-interactions"
    ],
    "0.1.1",
  );
  assert.equal(
    result.lockfile.packages["packages/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"],
    "0.1.1",
  );
  assert.equal(manifests["@vrtmrz/ui-interactions"].version, "0.1.0");
  assert.equal(
    manifests["@vrtmrz/obsidian-plugin-kit"].dependencies["@vrtmrz/ui-interactions"],
    "0.1.0",
  );
  assert.equal(
    manifests["@vrtmrz/browser-ui-kit"].dependencies["@vrtmrz/ui-interactions"],
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

test("loads SecretStore metadata when preparing only the Node adapter", (context) => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "fancy-kit-node-release-"));
  context.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));
  mkdirSync(join(repositoryRoot, "packages/secret-store-node"), { recursive: true });
  mkdirSync(join(repositoryRoot, "packages/secret-store"), { recursive: true });
  mkdirSync(join(repositoryRoot, "packages/ui-interactions"), { recursive: true });

  const nodeManifest = {
    name: "@vrtmrz/secret-store-node",
    version: "0.1.0",
    dependencies: { "@vrtmrz/secret-store": "0.0.0", "age-encryption": "0.3.1" },
  };
  const secretStoreManifest = { name: "@vrtmrz/secret-store", version: "0.0.0" };
  const lockfile = {
    packages: {
      "packages/secret-store-node": {
        version: "0.1.0",
        dependencies: { "@vrtmrz/secret-store": "0.0.0", "age-encryption": "0.3.1" },
      },
      "packages/secret-store": { version: "0.0.0" },
    },
  };
  writeFileSync(join(repositoryRoot, "packages/secret-store-node/package.json"), `${JSON.stringify(nodeManifest)}\n`);
  writeFileSync(join(repositoryRoot, "packages/secret-store/package.json"), `${JSON.stringify(secretStoreManifest)}\n`);
  writeFileSync(join(repositoryRoot, "packages/ui-interactions/package.json"), `${JSON.stringify({ name: "@vrtmrz/ui-interactions", version: "0.1.0" })}\n`);
  writeFileSync(join(repositoryRoot, "package-lock.json"), `${JSON.stringify(lockfile)}\n`);

  const result = prepareReleaseSetMetadata({
    repositoryRoot,
    selections: [{ packageName: "@vrtmrz/secret-store-node", version: "0.1.1" }],
  });

  assert.equal(result.preparations[0].packageDirectory, "packages/secret-store-node");
  assert.equal(result.manifests["@vrtmrz/secret-store"].version, "0.0.0");
  assert.equal(result.manifests["@vrtmrz/secret-store-node"].version, "0.1.1");
  assert.equal(result.manifests["@vrtmrz/secret-store-node"].dependencies["age-encryption"], "0.3.1");
  assert.equal(result.lockfile.packages["packages/secret-store"].version, "0.0.0");
});

test("loads local-storage metadata when preparing the plugin", (context) => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), "fancy-kit-plugin-release-"));
  context.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));
  for (const directory of ["obsidian-plugin-kit", "secret-store", "local-storage", "ui-interactions"]) {
    mkdirSync(join(repositoryRoot, `packages/${directory}`), { recursive: true });
  }

  const pluginManifest = {
    name: "@vrtmrz/obsidian-plugin-kit",
    version: "0.1.0",
    dependencies: {
      "@vrtmrz/ui-interactions": "0.1.0",
      "@vrtmrz/secret-store": "0.0.0",
      "@vrtmrz/local-storage": "0.0.0",
    },
  };
  const secretStoreManifest = { name: "@vrtmrz/secret-store", version: "0.0.0" };
  const localStorageManifest = { name: "@vrtmrz/local-storage", version: "0.0.0" };
  const lockfile = {
    packages: {
      "packages/obsidian-plugin-kit": {
        version: "0.1.0",
        dependencies: { ...pluginManifest.dependencies },
      },
      "packages/secret-store": { version: "0.0.0" },
      "packages/local-storage": { version: "0.0.0" },
    },
  };
  writeFileSync(join(repositoryRoot, "packages/obsidian-plugin-kit/package.json"), `${JSON.stringify(pluginManifest)}\n`);
  writeFileSync(join(repositoryRoot, "packages/secret-store/package.json"), `${JSON.stringify(secretStoreManifest)}\n`);
  writeFileSync(join(repositoryRoot, "packages/local-storage/package.json"), `${JSON.stringify(localStorageManifest)}\n`);
  writeFileSync(join(repositoryRoot, "packages/ui-interactions/package.json"), `${JSON.stringify({ name: "@vrtmrz/ui-interactions", version: "0.1.0" })}\n`);
  writeFileSync(join(repositoryRoot, "package-lock.json"), `${JSON.stringify(lockfile)}\n`);

  const result = prepareReleaseSetMetadata({
    repositoryRoot,
    selections: [{ packageName: "@vrtmrz/obsidian-plugin-kit", version: "0.1.1" }],
  });
  assert.equal(result.manifests["@vrtmrz/local-storage"].version, "0.0.0");
  assert.equal(result.manifests["@vrtmrz/obsidian-plugin-kit"].version, "0.1.1");
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
