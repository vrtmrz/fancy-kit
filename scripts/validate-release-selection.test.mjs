import assert from "node:assert/strict";
import test from "node:test";

import {
  assertKitDependencyIsPublished,
  assertVersionIsUnpublished,
  readReleaseSelectionMetadata,
  validateReleaseSelection,
} from "./validate-release-selection.mjs";

const sha = "a".repeat(40);
const base = {
  packageName: "@vrtmrz/ui-interactions",
  expectedVersion: "0.1.0-rc.0",
  distTag: "next",
  expectedSha: sha,
  actualSha: sha,
  confirmation: `stage @vrtmrz/ui-interactions@0.1.0-rc.0 to next from ${sha}`,
  manifest: { name: "@vrtmrz/ui-interactions", version: "0.1.0-rc.0" },
  lockEntry: { version: "0.1.0-rc.0" },
  uiManifest: { version: "0.1.0-rc.0" },
};

test("loads value-store metadata only for dependent staging selections", () => {
  const secretStorePath = "packages/secret-store/package.json";
  const valueStorePath = "packages/value-store/package.json";
  const independentReads = [];
  const independentMetadata = readReleaseSelectionMetadata("octagonal-wheels", (path) => {
    independentReads.push(path);
    return path === "package-lock.json" ? { packages: {} } : { name: "fixture", version: "0.1.0" };
  });
  assert.equal(independentMetadata.secretStoreManifest, undefined);
  assert.equal(independentMetadata.valueStoreManifest, undefined);
  assert.equal(independentReads.includes(secretStorePath), false);
  assert.equal(independentReads.includes(valueStorePath), false);

  const pluginReads = [];
  const pluginMetadata = readReleaseSelectionMetadata("@vrtmrz/obsidian-plugin-kit", (path) => {
    pluginReads.push(path);
    return path === "package-lock.json" ? { packages: {} } : { name: "fixture", version: "0.1.0" };
  });
  assert.deepEqual(pluginMetadata.secretStoreManifest, { name: "fixture", version: "0.1.0" });
  assert.deepEqual(pluginMetadata.valueStoreManifest, { name: "fixture", version: "0.1.0" });
  assert.equal(pluginReads.filter((path) => path === secretStorePath).length, 1);
  assert.equal(pluginReads.filter((path) => path === valueStorePath).length, 1);

  const nodeReads = [];
  const nodeMetadata = readReleaseSelectionMetadata("@vrtmrz/secret-store-node", (path) => {
    nodeReads.push(path);
    return path === "package-lock.json" ? { packages: {} } : { name: "fixture", version: "0.1.0" };
  });
  assert.deepEqual(nodeMetadata.secretStoreManifest, { name: "fixture", version: "0.1.0" });
  assert.deepEqual(nodeMetadata.valueStoreManifest, { name: "fixture", version: "0.1.0" });
  assert.equal(nodeReads.filter((path) => path === secretStorePath).length, 1);
  assert.equal(nodeReads.filter((path) => path === valueStorePath).length, 1);

  const valueDependentReads = [];
  const valueDependentMetadata = readReleaseSelectionMetadata("@vrtmrz/secret-store", (path) => {
    valueDependentReads.push(path);
    return path === "package-lock.json" ? { packages: {} } : { name: "fixture", version: "0.1.0" };
  });
  assert.equal(valueDependentReads.filter((path) => path === valueStorePath).length, 1);
  assert.equal(valueDependentReads.filter((path) => path === secretStorePath).length, 1);
  assert.equal(valueDependentMetadata.secretStoreManifest, undefined);
});

test("accepts an exact prerelease selection", () => {
  assert.equal(validateReleaseSelection(base).packageDirectory, "packages/ui-interactions");
});

test("accepts octagonal-wheels from its monorepo package directory", () => {
  const selection = {
    ...base,
    packageName: "octagonal-wheels",
    expectedVersion: "0.1.48-preview.0",
    confirmation: `stage octagonal-wheels@0.1.48-preview.0 to next from ${sha}`,
    manifest: { name: "octagonal-wheels", version: "0.1.48-preview.0" },
    lockEntry: { version: "0.1.48-preview.0" },
  };
  assert.equal(validateReleaseSelection(selection).packageDirectory, "packages/octagonal-wheels");
});

test("accepts the Node SecretStore adapter as a scoped package", () => {
  const packageName = "@vrtmrz/secret-store-node";
  const selection = {
    ...base,
    packageName,
    confirmation: `stage ${packageName}@0.1.0-rc.0 to next from ${sha}`,
    manifest: {
      name: packageName,
      version: "0.1.0-rc.0",
      dependencies: { "@vrtmrz/secret-store": "0.0.0", "@vrtmrz/value-store": "0.0.0", "age-encryption": "0.3.1" },
    },
    lockEntry: {
      version: "0.1.0-rc.0",
      dependencies: { "@vrtmrz/secret-store": "0.0.0", "@vrtmrz/value-store": "0.0.0", "age-encryption": "0.3.1" },
    },
    secretStoreManifest: { version: "0.0.0" },
    valueStoreManifest: { version: "0.0.0" },
  };
  assert.equal(validateReleaseSelection(selection).packageDirectory, "packages/secret-store-node");
});

test("accepts value-store as an independent scoped package", () => {
  const packageName = "@vrtmrz/value-store";
  const selection = {
    ...base,
    packageName,
    expectedVersion: "0.1.0-rc.0",
    confirmation: `stage ${packageName}@0.1.0-rc.0 to next from ${sha}`,
    manifest: { name: packageName, version: "0.1.0-rc.0" },
    lockEntry: { version: "0.1.0-rc.0" },
  };
  assert.equal(validateReleaseSelection(selection).packageDirectory, "packages/value-store");
});

for (const packageName of ["@vrtmrz/value-store", "@vrtmrz/secret-store"]) {
  for (const distTag of ["next", "latest"]) {
    test(`rejects development version 0.0.0 for ${packageName} under ${distTag}`, () => {
      const selection = {
        ...base,
        packageName,
        expectedVersion: "0.0.0",
        distTag,
        confirmation: `stage ${packageName}@0.0.0 to ${distTag} from ${sha}`,
        manifest: { name: packageName, version: "0.0.0" },
        lockEntry: { version: "0.0.0" },
      };
      assert.throws(() => validateReleaseSelection(selection), /Development version 0\.0\.0 cannot be staged/);
    });
  }
}

test("accepts SecretStore with its ValueStore dependency", () => {
  const packageName = "@vrtmrz/secret-store";
  const selection = {
    ...base,
    packageName,
    confirmation: `stage ${packageName}@0.1.0-rc.0 to next from ${sha}`,
    manifest: {
      name: packageName,
      version: "0.1.0-rc.0",
      dependencies: { "@vrtmrz/value-store": "0.0.0" },
    },
    lockEntry: { version: "0.1.0-rc.0", dependencies: { "@vrtmrz/value-store": "0.0.0" } },
    valueStoreManifest: { version: "0.0.0" },
  };
  assert.equal(validateReleaseSelection(selection).packageDirectory, "packages/secret-store");
});

for (const distTag of ["next", "latest"]) {
  test(`accepts stable versions under ${distTag}`, () => {
    const selection = {
      ...base,
      expectedVersion: "0.1.0",
      distTag,
      confirmation: `stage @vrtmrz/ui-interactions@0.1.0 to ${distTag} from ${sha}`,
      manifest: { name: "@vrtmrz/ui-interactions", version: "0.1.0" },
      lockEntry: { version: "0.1.0" },
      uiManifest: { version: "0.1.0" },
    };
    assert.equal(validateReleaseSelection(selection).packageDirectory, "packages/ui-interactions");
  });
}

test("rejects prereleases under latest", () => {
  assert.throws(
    () => validateReleaseSelection({
      ...base,
      distTag: "latest",
      confirmation: `stage @vrtmrz/ui-interactions@0.1.0-rc.0 to latest from ${sha}`,
    }),
    /Prereleases must use the next dist-tag/,
  );
});

test("rejects unsupported dist-tags", () => {
  for (const distTag of ["", "beta", "Latest"]) {
    assert.throws(() => validateReleaseSelection({ ...base, distTag }), /must be next or latest/);
  }
});

test("requires confirmation of the selected dist-tag", () => {
  const selection = {
    ...base,
    expectedVersion: "0.1.0",
    manifest: { name: "@vrtmrz/ui-interactions", version: "0.1.0" },
    lockEntry: { version: "0.1.0" },
  };
  for (const distTag of ["next", "latest"]) {
    const wrongTag = distTag === "next" ? "latest" : "next";
    assert.throws(
      () => validateReleaseSelection({
        ...selection,
        distTag,
        confirmation: `stage @vrtmrz/ui-interactions@0.1.0 to ${wrongTag} from ${sha}`,
      }),
      new RegExp(`Confirmation must be exactly: stage .* to ${distTag} from`),
    );
  }
});

test("rejects non-canonical or malformed release versions", () => {
  for (const expectedVersion of ["01.0.0", "0.1.0-01", "0.1.0-", "0.1.0-rc..0", "0.1"]) {
    assert.throws(() => validateReleaseSelection({ ...base, expectedVersion }), /Invalid semantic version/);
  }
});

test("requires each UI adapter dependency and lockfile to match UI interactions", () => {
  for (const packageName of [
    "@vrtmrz/browser-ui-kit",
    "@vrtmrz/obsidian-plugin-kit",
  ]) {
    const kit = {
      ...base,
      packageName,
      confirmation: `stage ${packageName}@0.1.0-rc.0 to next from ${sha}`,
      manifest: {
        name: packageName,
        version: "0.1.0-rc.0",
        dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
      },
      lockEntry: {
        version: "0.1.0-rc.0",
        dependencies: { "@vrtmrz/ui-interactions": "0.1.0" },
      },
    };
    assert.throws(
      () => validateReleaseSelection(kit),
      /workspace contains 0.1.0-rc.0/,
    );
  }
});

function pluginSelection() {
  const packageName = "@vrtmrz/obsidian-plugin-kit";
  return {
    ...base,
    packageName,
    confirmation: `stage ${packageName}@0.1.0-rc.0 to next from ${sha}`,
    manifest: {
      name: packageName,
      version: "0.1.0-rc.0",
      dependencies: {
        "@vrtmrz/ui-interactions": "0.1.0-rc.0",
        "@vrtmrz/secret-store": "0.0.0",
        "@vrtmrz/value-store": "0.0.0",
      },
    },
    lockEntry: {
      version: "0.1.0-rc.0",
      dependencies: {
        "@vrtmrz/ui-interactions": "0.1.0-rc.0",
        "@vrtmrz/secret-store": "0.0.0",
        "@vrtmrz/value-store": "0.0.0",
      },
    },
    uiManifest: { version: "0.1.0-rc.0" },
    secretStoreManifest: { version: "0.0.0" },
    valueStoreManifest: { version: "0.0.0" },
  };
}

function nodeSelection() {
  const packageName = "@vrtmrz/secret-store-node";
  return {
    ...base,
    packageName,
    confirmation: `stage ${packageName}@0.1.0-rc.0 to next from ${sha}`,
    manifest: {
      name: packageName,
      version: "0.1.0-rc.0",
      dependencies: {
        "@vrtmrz/secret-store": "0.0.0",
        "@vrtmrz/value-store": "0.0.0",
        "age-encryption": "0.3.1",
      },
    },
    lockEntry: {
      version: "0.1.0-rc.0",
      dependencies: {
        "@vrtmrz/secret-store": "0.0.0",
        "@vrtmrz/value-store": "0.0.0",
        "age-encryption": "0.3.1",
      },
    },
    secretStoreManifest: { version: "0.0.0" },
    valueStoreManifest: { version: "0.0.0" },
  };
}

test("requires the Node adapter's ValueStore pin to match the workspace", () => {
  const selection = nodeSelection();
  selection.manifest.dependencies["@vrtmrz/value-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /value-store.*workspace contains 0.0.0/,
  );
});

test("requires the Node adapter's ValueStore pin to match the lockfile", () => {
  const selection = nodeSelection();
  selection.lockEntry.dependencies["@vrtmrz/value-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /value-store dependency does not match the lockfile/,
  );
});

test("requires the Node adapter's SecretStore pin to match the workspace", () => {
  const selection = nodeSelection();
  selection.manifest.dependencies["@vrtmrz/secret-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /secret-store.*workspace contains 0.0.0/,
  );
});

test("rejects a missing Node adapter SecretStore pin and workspace manifest", () => {
  const selection = nodeSelection();
  delete selection.manifest.dependencies["@vrtmrz/secret-store"];
  delete selection.lockEntry.dependencies["@vrtmrz/secret-store"];
  delete selection.secretStoreManifest;
  assert.throws(
    () => validateReleaseSelection(selection),
    /@vrtmrz\/secret-store/,
  );
});

test("rejects a non-version Node adapter SecretStore pin even when workspace and lockfile match", () => {
  const selection = nodeSelection();
  selection.manifest.dependencies["@vrtmrz/secret-store"] = "latest";
  selection.lockEntry.dependencies["@vrtmrz/secret-store"] = "latest";
  selection.secretStoreManifest.version = "latest";
  assert.throws(
    () => validateReleaseSelection(selection),
    /@vrtmrz\/secret-store/,
  );
});

test("requires the Node adapter's SecretStore pin to match the lockfile", () => {
  const selection = nodeSelection();
  selection.lockEntry.dependencies["@vrtmrz/secret-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /SecretStore dependency does not match the lockfile/,
  );
});

test("requires the selected plugin's value-store pin to match the workspace", () => {
  const selection = pluginSelection();
  selection.manifest.dependencies["@vrtmrz/value-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /value-store.*workspace contains 0.0.0/,
  );
});

test("rejects a missing plugin value-store pin and workspace manifest", () => {
  const selection = pluginSelection();
  delete selection.manifest.dependencies["@vrtmrz/value-store"];
  delete selection.lockEntry.dependencies["@vrtmrz/value-store"];
  delete selection.valueStoreManifest;
  assert.throws(
    () => validateReleaseSelection(selection),
    /@vrtmrz\/value-store/,
  );
});

test("rejects a malformed plugin value-store pin even when workspace and lockfile match", () => {
  const selection = pluginSelection();
  selection.manifest.dependencies["@vrtmrz/value-store"] = "latest";
  selection.lockEntry.dependencies["@vrtmrz/value-store"] = "latest";
  selection.valueStoreManifest.version = "latest";
  assert.throws(
    () => validateReleaseSelection(selection),
    /@vrtmrz\/value-store/,
  );
});

test("requires the selected plugin's value-store pin to match the lockfile", () => {
  const selection = pluginSelection();
  selection.lockEntry.dependencies["@vrtmrz/value-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /value-store dependency does not match the lockfile/,
  );
});

test("requires the selected plugin's SecretStore pin to match the workspace", () => {
  const selection = pluginSelection();
  selection.manifest.dependencies["@vrtmrz/secret-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /secret-store.*workspace contains 0.0.0/,
  );
});

test("rejects a missing plugin SecretStore pin and workspace manifest", () => {
  const selection = pluginSelection();
  delete selection.manifest.dependencies["@vrtmrz/secret-store"];
  delete selection.lockEntry.dependencies["@vrtmrz/secret-store"];
  delete selection.secretStoreManifest;
  assert.throws(
    () => validateReleaseSelection(selection),
    /@vrtmrz\/secret-store/,
  );
});

test("rejects a non-version SecretStore pin even when workspace and lockfile match", () => {
  const selection = pluginSelection();
  selection.manifest.dependencies["@vrtmrz/secret-store"] = "latest";
  selection.lockEntry.dependencies["@vrtmrz/secret-store"] = "latest";
  selection.secretStoreManifest.version = "latest";
  assert.throws(
    () => validateReleaseSelection(selection),
    /@vrtmrz\/secret-store/,
  );
});

test("requires the selected plugin's SecretStore pin to match the lockfile", () => {
  const selection = pluginSelection();
  selection.lockEntry.dependencies["@vrtmrz/secret-store"] = "0.0.1";
  assert.throws(
    () => validateReleaseSelection(selection),
    /SecretStore dependency does not match the lockfile/,
  );
});

test("distinguishes an unpublished registry version from registry failure", async () => {
  await assert.doesNotReject(assertVersionIsUnpublished("@vrtmrz/ui-interactions", "0.1.0", async () => ({ status: 404, ok: false })));
  await assert.rejects(assertVersionIsUnpublished("@vrtmrz/ui-interactions", "0.1.0", async () => ({ status: 503, ok: false })), /HTTP 503/);
  await assert.rejects(assertVersionIsUnpublished("@vrtmrz/ui-interactions", "0.1.0", async () => ({ status: 200, ok: true })), /already present/);
});

test("requires each UI adapter's UI version to exist on npm", async () => {
  for (const packageName of [
    "@vrtmrz/browser-ui-kit",
    "@vrtmrz/obsidian-plugin-kit",
  ]) {
    const manifest = {
      dependencies: {
        "@vrtmrz/ui-interactions": "0.1.0",
        ...(packageName === "@vrtmrz/obsidian-plugin-kit"
          ? { "@vrtmrz/secret-store": "0.0.0", "@vrtmrz/value-store": "0.0.0" }
          : {}),
      },
    };
    await assert.rejects(
      assertKitDependencyIsPublished(packageName, manifest, async () => ({
        ok: false,
      })),
      /must be published/,
    );
    await assert.doesNotReject(
      assertKitDependencyIsPublished(packageName, manifest, async () => ({
        ok: true,
      })),
    );
  }
});

test("requires ValueStore to be published before staging SecretStore", async () => {
  const packageName = "@vrtmrz/secret-store";
  const manifest = { dependencies: { "@vrtmrz/value-store": "0.1.0" } };
  const requests = [];
  await assert.rejects(
    assertKitDependencyIsPublished(packageName, manifest, async (url) => {
      requests.push(url);
      return { ok: false };
    }),
    /@vrtmrz\/value-store@0\.1\.0 must be published/,
  );
  assert.deepEqual(requests, ["https://registry.npmjs.org/%40vrtmrz%2Fvalue-store/0.1.0"]);
});

test("requires the plugin's ValueStore and SecretStore versions to exist on npm alongside UI interactions", async () => {
  const packageName = "@vrtmrz/obsidian-plugin-kit";
  const manifest = {
    dependencies: {
      "@vrtmrz/ui-interactions": "0.1.0",
      "@vrtmrz/secret-store": "0.0.0",
      "@vrtmrz/value-store": "0.0.0",
    },
  };
  const requests = [];
  await assert.rejects(
    assertKitDependencyIsPublished(packageName, manifest, async (url) => {
      requests.push(url);
      return { ok: !url.includes("%40vrtmrz%2Fsecret-store") };
    }),
    /@vrtmrz\/secret-store@0.0.0 must be published/,
  );
  assert.deepEqual(requests, [
    "https://registry.npmjs.org/%40vrtmrz%2Fui-interactions/0.1.0",
    "https://registry.npmjs.org/%40vrtmrz%2Fvalue-store/0.0.0",
    "https://registry.npmjs.org/%40vrtmrz%2Fsecret-store/0.0.0",
  ]);
});


test("requires SecretStore to be published before staging the Node adapter", async () => {
  const packageName = "@vrtmrz/secret-store-node";
  const manifest = {
    dependencies: { "@vrtmrz/secret-store": "0.0.0", "@vrtmrz/value-store": "0.0.0", "age-encryption": "0.3.1" },
  };
  const requests = [];
  await assert.rejects(
    assertKitDependencyIsPublished(packageName, manifest, async (url) => {
      requests.push(url);
      return { ok: !url.includes("%40vrtmrz%2Fsecret-store") };
    }),
    /@vrtmrz\/secret-store@0\.0\.0 must be published/,
  );
  assert.deepEqual(requests, [
    "https://registry.npmjs.org/%40vrtmrz%2Fvalue-store/0.0.0",
    "https://registry.npmjs.org/%40vrtmrz%2Fsecret-store/0.0.0",
  ]);
});


test("requires value-store to be published before staging the plugin", async () => {
  const packageName = "@vrtmrz/obsidian-plugin-kit";
  const manifest = {
    dependencies: {
      "@vrtmrz/ui-interactions": "0.1.0",
      "@vrtmrz/secret-store": "0.0.0",
      "@vrtmrz/value-store": "0.0.0",
    },
  };
  const requests = [];
  await assert.rejects(
    assertKitDependencyIsPublished(packageName, manifest, async (url) => {
      requests.push(url);
      return { ok: !url.includes("%40vrtmrz%2Fvalue-store") };
    }),
    /@vrtmrz\/value-store@0\.0\.0 must be published/,
  );
  assert.deepEqual(requests, [
    "https://registry.npmjs.org/%40vrtmrz%2Fui-interactions/0.1.0",
    "https://registry.npmjs.org/%40vrtmrz%2Fvalue-store/0.0.0",
  ]);
});
