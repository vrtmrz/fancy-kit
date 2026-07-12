import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageNames = [
  "@vrtmrz/obsidian-test-session",
  "@vrtmrz/ui-interactions",
  "@vrtmrz/obsidian-plugin-kit",
];
const runtimeSafeEntries = [
  "@vrtmrz/obsidian-test-session",
  "@vrtmrz/ui-interactions",
  "@vrtmrz/ui-interactions/testing",
];

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
      tarballs.push(resolve(temporaryRoot, packed[0].filename));
    }

    await writeFile(
      join(temporaryRoot, "package.json"),
      `${JSON.stringify({ name: "packed-consumer", private: true, type: "module" }, null, 2)}\n`,
    );

    const developmentNames = [...peerNames, "@types/node", "typescript"];
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
      join(repositoryRoot, "test", "packed-consumer", "obsidian-plugin-kit-usage.ts"),
      join(temporaryRoot, "obsidian-plugin-kit-usage.ts"),
    );
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
          files: ["public-exports.ts", "obsidian-plugin-kit-usage.ts"],
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

    const obsidianFeatureModules = [
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
      source: `import { createObsidianVaultTextAccess } from "@vrtmrz/obsidian-plugin-kit";

export const createVaultAccess = createObsidianVaultTextAccess;
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
      ],
      externalImports: ["obsidian"],
    });

    console.log(
      `Verified ${packageNames.length} packed packages, ${publicEntries.length} public export entries, the plug-in-kit usage fixture, ${runtimeSafeEntries.length} runtime-safe imports, and 2 tree-shaking bundle checks.`,
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

await main();
