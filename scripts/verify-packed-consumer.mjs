import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

    console.log(
      `Verified ${packageNames.length} packed packages, ${publicEntries.length} public export entries, the plug-in-kit usage fixture, and ${runtimeSafeEntries.length} runtime-safe imports.`,
    );
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

await main();
