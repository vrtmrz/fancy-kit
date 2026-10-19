import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageNames = [
  "@vrtmrz/secret-store",
  "@vrtmrz/secret-store-node",
  "@vrtmrz/local-storage",
  "@vrtmrz/obsidian-test-session",
  "@vrtmrz/ui-interactions",
  "@vrtmrz/browser-ui-kit",
  "@vrtmrz/obsidian-plugin-kit",
];
const runtimeSafeEntries = [
  "@vrtmrz/secret-store-node/age",
  "@vrtmrz/local-storage",
  "@vrtmrz/local-storage/web-storage",
  "@vrtmrz/local-storage/node",
  "@vrtmrz/obsidian-plugin-kit/secrets",
  "@vrtmrz/obsidian-plugin-kit/local-storage",
  "@vrtmrz/secret-store",
  "@vrtmrz/obsidian-test-session",
  "@vrtmrz/ui-interactions",
  "@vrtmrz/ui-interactions/testing",
  "@vrtmrz/browser-ui-kit",
];
const packagedDocumentation = new Map([
  ["@vrtmrz/secret-store", ["README.md"]],
  ["@vrtmrz/secret-store-node", ["README.md"]],
  ["@vrtmrz/local-storage", ["README.md"]],
  ["@vrtmrz/obsidian-test-session", ["docs/usage-guide.md"]],
  ["@vrtmrz/ui-interactions", ["docs/usage-guide.md"]],
  ["@vrtmrz/browser-ui-kit", ["docs/usage-guide.md"]],
  ["@vrtmrz/obsidian-plugin-kit", ["docs/usage-guide.md"]],
  ["octagonal-wheels", ["guides/imports-and-runtime.md"]],
]);

function npmInvocation(args) {
  const npmExecutable = process.env.npm_execpath;
  if (npmExecutable) {
    return {
      command: process.execPath,
      args: [npmExecutable, ...args],
    };
  }
  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args,
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(
      `${command} ${args.join(" ")} exited with status ${result.status}${
        output ? `:\n${output}` : ""
      }`,
    );
  }
  return result.stdout?.trim() ?? "";
}

function runNpm(args, options) {
  const invocation = npmInvocation(args);
  return run(invocation.command, invocation.args, options);
}

function packageDirectory(packageName) {
  return join(repositoryRoot, "packages", packageName.slice("@vrtmrz/".length));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function publicSpecifier(packageName, exportName) {
  if (exportName === ".") return packageName;
  if (!exportName.startsWith("./")) {
    throw new Error(`Unsupported export key ${exportName} in ${packageName}`);
  }
  return `${packageName}/${exportName.slice(2)}`;
}

function normaliseModulePath(path) {
  return path.replaceAll("\\", "/");
}

function verifyPackedDocumentation(packageName, packed) {
  const packedFiles = new Set(
    (packed.files ?? []).map((file) => normaliseModulePath(file.path)),
  );
  for (const documentPath of packagedDocumentation.get(packageName) ?? []) {
    if (!packedFiles.has(documentPath)) {
      throw new Error(`${packageName} tarball omits ${documentPath}`);
    }
  }
}

function hasModule(contributors, moduleSuffix) {
  const normalisedSuffix = normaliseModulePath(moduleSuffix);
  return contributors.some((path) => path.endsWith(normalisedSuffix));
}

async function verifyTreeShakenBundle({
  temporaryRoot,
  entryName,
  source,
  requiredModules,
  excludedModules,
  externalImports,
  allowedPackages,
}) {
  const entryPath = join(temporaryRoot, entryName);
  await writeFile(entryPath, source);

  const result = await build({
    absWorkingDir: temporaryRoot,
    entryPoints: [entryPath],
    bundle: true,
    external: ["obsidian"],
    format: "esm",
    logLevel: "silent",
    metafile: true,
    minify: true,
    platform: "browser",
    target: "es2022",
    treeShaking: true,
    write: false,
  });
  const outputs = Object.values(result.metafile.outputs);
  if (outputs.length !== 1 || outputs[0] === undefined) {
    throw new Error(`${entryName} produced ${outputs.length} bundle outputs; expected one`);
  }

  if (allowedPackages) {
    const allowedRoots = allowedPackages.map((name) => `node_modules/${name}/`);
    const unexpected = Object.keys(result.metafile.inputs)
      .map(normaliseModulePath)
      .filter((path) => path !== entryName && !allowedRoots.some((root) => path.startsWith(root)));
    if (unexpected.length > 0) {
      throw new Error(`${entryName} loaded unexpected modules: ${unexpected.join(", ")}`);
    }
  }

  const output = outputs[0];
  const contributors = Object.entries(output.inputs)
    .filter(([, contribution]) => contribution.bytesInOutput > 0)
    .map(([path]) => normaliseModulePath(path));

  for (const moduleSuffix of requiredModules) {
    if (!hasModule(contributors, moduleSuffix)) {
      throw new Error(`${entryName} did not retain required module ${moduleSuffix}`);
    }
  }
  for (const moduleSuffix of excludedModules) {
    if (hasModule(contributors, moduleSuffix)) {
      throw new Error(`${entryName} retained excluded module ${moduleSuffix}`);
    }
  }

  const actualExternalImports = output.imports
    .filter((item) => item.external)
    .map((item) => item.path)
    .sort();
  const expectedExternalImports = [...externalImports].sort();
  if (JSON.stringify(actualExternalImports) !== JSON.stringify(expectedExternalImports)) {
    throw new Error(
      `${entryName} external imports were ${JSON.stringify(actualExternalImports)}; expected ${JSON.stringify(expectedExternalImports)}`,
    );
  }
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "fancy-kit-consumer-"));
  try {
    const rootManifest = await readJson(join(repositoryRoot, "package.json"));
    const peerNames = new Set();
    for (const packageName of packageNames) {
      const manifest = await readJson(join(packageDirectory(packageName), "package.json"));
      for (const peerName of Object.keys(manifest.peerDependencies ?? {})) {
        peerNames.add(peerName);
      }
    }

    const tarballs = [];
    for (const packageName of packageNames) {
      const packOutput = runNpm(
        [
          "pack",
          "--workspace",
          packageName,
          "--pack-destination",
          temporaryRoot,
          "--ignore-scripts",
          "--json",
        ],
        { capture: true },
      );
      const packed = JSON.parse(packOutput);
      if (packed.length !== 1 || !packed[0].filename) {
        throw new Error(`npm pack returned no tarball for ${packageName}`);
      }
      verifyPackedDocumentation(packageName, packed[0]);
      tarballs.push(resolve(temporaryRoot, packed[0].filename));
    }

    const octagonalPackOutput = runNpm(
      [
        "pack",
        "--workspace",
        "octagonal-wheels",
        "--pack-destination",
        temporaryRoot,
        "--ignore-scripts",
        "--json",
      ],
      { capture: true },
    );
    const octagonalPacked = JSON.parse(octagonalPackOutput);
    if (octagonalPacked.length !== 1 || !octagonalPacked[0].filename) {
      throw new Error("npm pack returned no tarball for octagonal-wheels");
    }
    verifyPackedDocumentation("octagonal-wheels", octagonalPacked[0]);

    await writeFile(
      join(temporaryRoot, "package.json"),
      `${JSON.stringify({ name: "packed-consumer", private: true, type: "module" }, null, 2)}\n`,
    );

    const developmentNames = [...peerNames, "@types/node", "typescript", "age-encryption"];
    const developmentPackages = developmentNames.map((packageName) => {
      const version = rootManifest.devDependencies?.[packageName];
      if (!version) {
        throw new Error(
          `Root devDependencies must provide ${packageName} for packed-consumer verification`,
        );
      }
      return `${packageName}@${version}`;
    });
    runNpm(
      [
        "install",
        "--ignore-scripts",
        "--package-lock=false",
        "--no-audit",
        "--no-fund",
        "--no-save",
        ...tarballs,
        ...developmentPackages,
      ],
      { cwd: temporaryRoot },
    );

    const publicEntries = [];
    for (const packageName of packageNames) {
      const installedManifest = await readJson(
        join(temporaryRoot, "node_modules", packageName, "package.json"),
      );
      if (installedManifest.name !== packageName) {
        throw new Error(`Installed tarball does not contain ${packageName}`);
      }
      if (!installedManifest.exports || Array.isArray(installedManifest.exports)) {
        throw new Error(`${packageName} does not declare public exports`);
      }
      for (const exportName of Object.keys(installedManifest.exports)) {
        publicEntries.push(publicSpecifier(packageName, exportName));
      }
    }

    await writeFile(
      join(temporaryRoot, "public-exports.ts"),
      `${publicEntries
        .map(
          (specifier, index) =>
            `import * as publicExport${index} from ${JSON.stringify(specifier)};\nvoid publicExport${index};`,
        )
        .join("\n")}\n`,
    );
    await copyFile(
      join(repositoryRoot, "test", "packed-consumer", "browser-ui-kit-usage.ts"),
      join(temporaryRoot, "browser-ui-kit-usage.ts"),
    );
    await copyFile(
      join(repositoryRoot, "test", "packed-consumer", "obsidian-plugin-kit-usage.ts"),
      join(temporaryRoot, "obsidian-plugin-kit-usage.ts"),
    );
    await copyFile(
      join(repositoryRoot, "test", "packed-consumer", "scripted-step-types.ts"),
      join(temporaryRoot, "scripted-step-types.ts"),
    );
    await copyFile(
      join(repositoryRoot, "test", "packed-consumer", "test-session-usage.ts"),
      join(temporaryRoot, "test-session-usage.ts"),
    );
    await copyFile(
      join(repositoryRoot, "test", "packed-consumer", "secret-store-usage.ts"),
      join(temporaryRoot, "secret-store-usage.ts"),
    );
    await copyFile(
      join(repositoryRoot, "test", "packed-consumer", "obsidian-secrets-usage.ts"),
      join(temporaryRoot, "obsidian-secrets-usage.ts"),
    );
    for (const filename of ["secret-store-node-usage.ts", "secret-store-node-runtime.mjs"]) {
      await copyFile(
        join(repositoryRoot, "test", "packed-consumer", filename),
        join(temporaryRoot, filename),
      );
    }
    for (const filename of [
      "local-storage-usage.ts",
      "local-storage-node-usage.ts",
      "local-storage-runtime.mjs",
    ]) {
      await copyFile(
        join(repositoryRoot, "test", "packed-consumer", filename),
        join(temporaryRoot, filename),
      );
    }
    await writeFile(
      join(temporaryRoot, "tsconfig.secret-store-node.json"),
      JSON.stringify({
        compilerOptions: {
          lib: ["ES2023"], module: "NodeNext", moduleResolution: "NodeNext",
          noEmit: true, strict: true, target: "ES2023", types: ["node"],
        },
        files: ["secret-store-node-usage.ts"],
      }, null, 2),
    );
    run(process.execPath, [
      join(temporaryRoot, "node_modules", "typescript", "bin", "tsc"),
      "-p", "tsconfig.secret-store-node.json",
    ], { cwd: temporaryRoot });
    run(process.execPath, ["secret-store-node-runtime.mjs"], { cwd: temporaryRoot });
    await writeFile(
      join(temporaryRoot, "tsconfig.local-storage-node.json"),
      JSON.stringify({
        compilerOptions: {
          lib: ["ES2023"], module: "NodeNext", moduleResolution: "NodeNext",
          noEmit: true, strict: true, target: "ES2023", types: ["node"],
        },
        files: ["local-storage-node-usage.ts"],
      }, null, 2),
    );
    run(process.execPath, [
      join(temporaryRoot, "node_modules", "typescript", "bin", "tsc"),
      "-p", "tsconfig.local-storage-node.json",
    ], { cwd: temporaryRoot });
    await writeFile(
      join(temporaryRoot, "tsconfig.local-storage.json"),
      JSON.stringify({
        compilerOptions: {
          lib: ["ES2022"], module: "NodeNext", moduleResolution: "NodeNext",
          noEmit: true, strict: true, target: "ES2022", types: [],
        },
        files: ["local-storage-usage.ts"],
      }, null, 2),
    );
    run(process.execPath, [
      join(temporaryRoot, "node_modules", "typescript", "bin", "tsc"),
      "-p", "tsconfig.local-storage.json",
    ], { cwd: temporaryRoot });
    run(process.execPath, ["local-storage-runtime.mjs"], { cwd: temporaryRoot });
    await writeFile(
      join(temporaryRoot, "secret-store-runtime.mjs"),
      `import assert from "node:assert/strict";
import { MemorySecretStore, SecretStoreError } from "@vrtmrz/secret-store";
import { createObsidianSecretStore } from "@vrtmrz/obsidian-plugin-kit/secrets";
const store = new MemorySecretStore();
assert.equal(await store.getValue("token"), null);
await store.setValue("token", "");
assert.equal(await store.getValue("token"), "");
assert.equal(await new MemorySecretStore().getValue("token"), null);
await assert.rejects(store.setValue("INVALID", "placeholder"), error =>
  error instanceof SecretStoreError && error.code === "invalid-name");
const entries = new Map();
const adapter = createObsidianSecretStore({
  getSecret: name => entries.get(name) ?? null,
  setSecret: (name, value) => { entries.set(name, value); },
});
assert.equal(await adapter.getValue("token"), null);
await adapter.setValue("token", "");
assert.equal(await adapter.getValue("token"), "");
await assert.rejects(adapter.getValue("INVALID"), error =>
  error instanceof SecretStoreError && error.code === "invalid-name");
assert.throws(() => createObsidianSecretStore(undefined), error =>
  error instanceof SecretStoreError && error.code === "unavailable");
for (const length of [65, 128]) {
  for (const reader of [store, adapter]) {
    await assert.rejects(reader.getValue("a".repeat(length)), error =>
      error instanceof SecretStoreError && error.code === "invalid-name");
  }
}
`,
    );
    run(process.execPath, ["secret-store-runtime.mjs"], { cwd: temporaryRoot });
    await writeFile(
      join(temporaryRoot, "tsconfig.secret-store.json"),
      JSON.stringify({
        compilerOptions: {
          lib: ["ES2022"], module: "NodeNext", moduleResolution: "NodeNext",
          noEmit: true, strict: true, target: "ES2022", types: [],
        },
        files: ["secret-store-usage.ts", "obsidian-secrets-usage.ts"],
      }, null, 2),
    );
    run(process.execPath, [
      join(temporaryRoot, "node_modules", "typescript", "bin", "tsc"),
      "-p", "tsconfig.secret-store.json",
    ], { cwd: temporaryRoot });

    await writeFile(
      join(temporaryRoot, "tsconfig.json"),
      `${JSON.stringify(
        {
          compilerOptions: {
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            module: "NodeNext",
            moduleResolution: "NodeNext",
            noEmit: true,
            skipLibCheck: true,
            strict: true,
            target: "ES2022",
            types: ["node"],
          },
          files: [
            "public-exports.ts",
            "browser-ui-kit-usage.ts",
            "obsidian-plugin-kit-usage.ts",
            "scripted-step-types.ts",
            "test-session-usage.ts",
          ],
        },
        null,
        2,
      )}\n`,
    );
    run(
      process.execPath,
      [join(temporaryRoot, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json"],
      { cwd: temporaryRoot },
    );

    await writeFile(
      join(temporaryRoot, "runtime-imports.mjs"),
      `${runtimeSafeEntries
        .map((specifier) => `await import(${JSON.stringify(specifier)});`)
        .join("\n")}\n`,
    );
    run(process.execPath, ["runtime-imports.mjs"], { cwd: temporaryRoot });

    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "neutral-secret-store.ts",
      source: `export { MemorySecretStore, SecretStoreError, validateSecretName } from "@vrtmrz/secret-store";`,
      requiredModules: [
        "node_modules/@vrtmrz/secret-store/dist/memory.js",
        "node_modules/@vrtmrz/secret-store/dist/errors.js",
        "node_modules/@vrtmrz/secret-store/dist/validation.js",
      ],
      excludedModules: [],
      externalImports: [],
      allowedPackages: ["@vrtmrz/secret-store"],
    });

    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "obsidian-secret-adapter.ts",
      source: `export { createObsidianSecretStore } from "@vrtmrz/obsidian-plugin-kit/secrets";`,
      requiredModules: [
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/secrets.js",
        "node_modules/@vrtmrz/secret-store/dist/errors.js",
        "node_modules/@vrtmrz/secret-store/dist/validation.js",
      ],
      excludedModules: [
        "node_modules/@vrtmrz/secret-store/dist/memory.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/ui-context.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault.js",
      ],
      externalImports: [],
      allowedPackages: ["@vrtmrz/secret-store", "@vrtmrz/obsidian-plugin-kit"],
    });

    const localStorageNodeModules = [
      "node_modules/@vrtmrz/local-storage/dist/node/index.js",
      "node_modules/@vrtmrz/local-storage/dist/node/files.js",
      "node_modules/@vrtmrz/local-storage/dist/node/format.js",
      "node_modules/@vrtmrz/local-storage/dist/node/operations.js",
      "node_modules/@vrtmrz/local-storage/dist/node/types.js",
    ];
    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "neutral-local-storage.ts",
      source: `export { MemoryLocalValueStore, LocalStorageError } from "@vrtmrz/local-storage";`,
      requiredModules: [
        "node_modules/@vrtmrz/local-storage/dist/memory.js",
        "node_modules/@vrtmrz/local-storage/dist/errors.js",
        "node_modules/@vrtmrz/local-storage/dist/validation.js",
      ],
      excludedModules: localStorageNodeModules,
      externalImports: [],
      allowedPackages: ["@vrtmrz/local-storage"],
    });

    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "web-storage-adapter.ts",
      source: `export { createWebStorageLocalStore } from "@vrtmrz/local-storage/web-storage";`,
      requiredModules: [
        "node_modules/@vrtmrz/local-storage/dist/web-storage.js",
        "node_modules/@vrtmrz/local-storage/dist/errors.js",
        "node_modules/@vrtmrz/local-storage/dist/validation.js",
      ],
      excludedModules: localStorageNodeModules,
      externalImports: [],
      allowedPackages: ["@vrtmrz/local-storage"],
    });

    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "obsidian-local-storage.ts",
      source: `export {
  createObsidianLocalStore,
  createCompatibleObsidianLocalStore,
} from "@vrtmrz/obsidian-plugin-kit/local-storage";
`,
      requiredModules: [
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/local-storage.js",
        "node_modules/@vrtmrz/local-storage/dist/web-storage.js",
        "node_modules/@vrtmrz/local-storage/dist/errors.js",
        "node_modules/@vrtmrz/local-storage/dist/validation.js",
      ],
      excludedModules: [
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/secrets.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/dialog.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/notice.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/progress.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/ui-context.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/testing.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault-testing.js",
        ...localStorageNodeModules,
        "node_modules/@vrtmrz/secret-store/dist/index.js",
        "node_modules/@vrtmrz/secret-store/dist/errors.js",
        "node_modules/@vrtmrz/secret-store/dist/validation.js",
        "node_modules/@vrtmrz/secret-store/dist/memory.js",
      ],
      externalImports: [],
      allowedPackages: ["@vrtmrz/local-storage", "@vrtmrz/obsidian-plugin-kit"],
    });

    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "browser-adapters.ts",
      source: `export {
  createBrowserUi,
  createBrowserUiNotifications,
} from "@vrtmrz/browser-ui-kit";
`,
      requiredModules: [
        "node_modules/@vrtmrz/browser-ui-kit/dist/interactions.js",
        "node_modules/@vrtmrz/browser-ui-kit/dist/notifications.js",
        "node_modules/@vrtmrz/ui-interactions/dist/driven-ui.js",
      ],
      excludedModules: [
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/dialog.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/notice.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/ui-context.js",
      ],
      externalImports: [],
    });

    const obsidianFeatureModules = [
      "node_modules/@vrtmrz/obsidian-plugin-kit/dist/secrets.js",
      "node_modules/@vrtmrz/obsidian-plugin-kit/dist/dialog.js",
      "node_modules/@vrtmrz/obsidian-plugin-kit/dist/notice.js",
      "node_modules/@vrtmrz/obsidian-plugin-kit/dist/progress.js",
      "node_modules/@vrtmrz/obsidian-plugin-kit/dist/ui-context.js",
      "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault.js",
    ];
    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "app-free-testing.ts",
      source: `import {
  createUiTestHarness,
  createVaultFrontmatterTestHarness,
  createVaultTextTestHarness,
} from "@vrtmrz/obsidian-plugin-kit/testing";

const ui = createUiTestHarness([
  { kind: "promptText", value: "device" },
]);
await ui.ui.promptText({ title: "Device" });
ui.assertDone();

const vault = createVaultTextTestHarness();
await vault.vault.createText("note.md", "text");
console.log(vault.getFile("note.md"));

const frontmatter = createVaultFrontmatterTestHarness({
  files: { "note.md": { value: "before" } },
});
await frontmatter.vault.updateFrontmatter("note.md", (value) => {
  value.value = "after";
});
console.log(frontmatter.getFrontmatter("note.md"));
`,
      requiredModules: [
        "node_modules/@vrtmrz/ui-interactions/dist/testing.js",
        "node_modules/@vrtmrz/ui-interactions/dist/driven-ui.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault-testing.js",
      ],
      excludedModules: obsidianFeatureModules,
      externalImports: [],
    });

    await verifyTreeShakenBundle({
      temporaryRoot,
      entryName: "root-vault-import.ts",
      source: `import {
  createObsidianVaultFrontmatterAccess,
  createObsidianVaultTextAccess,
} from "@vrtmrz/obsidian-plugin-kit";

export const createVaultAccess = createObsidianVaultTextAccess;
export const createFrontmatterAccess = createObsidianVaultFrontmatterAccess;
`,
      requiredModules: [
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault-contracts.js",
      ],
      excludedModules: [
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/dialog.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/notice.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/progress.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/ui-context.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/testing.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/vault-testing.js",
        "node_modules/@vrtmrz/ui-interactions/dist/contracts.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/secrets.js",
        "node_modules/@vrtmrz/obsidian-plugin-kit/dist/local-storage.js",
        "node_modules/@vrtmrz/local-storage/dist/web-storage.js",
        "node_modules/@vrtmrz/local-storage/dist/errors.js",
        "node_modules/@vrtmrz/local-storage/dist/validation.js",
        ...localStorageNodeModules,
        "node_modules/@vrtmrz/secret-store/dist/errors.js",
        "node_modules/@vrtmrz/secret-store/dist/validation.js",
      ],
      externalImports: ["obsidian"],
    });

    console.log(
      `Verified ${packageNames.length} installed packed packages, documentation in ${packagedDocumentation.size} packed packages, ${publicEntries.length} public export entries, the browser-kit, plug-in-kit, scripted-step, and test-session layout fixtures, ${runtimeSafeEntries.length} runtime-safe imports, the neutral, Obsidian, and Node secret-store type and runtime fixtures, the neutral and Node local-storage type fixtures and runtime fixture, and 8 tree-shaking bundle checks.`,
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

await main();
