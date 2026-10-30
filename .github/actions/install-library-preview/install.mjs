import { execFileSync } from "node:child_process";
import { appendFile, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { sources, verifyPreview } from "./contract.mjs";

function run(command, args, root) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
    timeout: 5 * 60_000,
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function dependencyNames(manifests) {
  return new Set(manifests.flatMap((manifest) => ["dependencies", "devDependencies", "optionalDependencies"]
    .flatMap((field) => Object.keys(manifest[field] ?? {}))));
}

function readArchive(entry, execute, root) {
  const manifest = JSON.parse(execute("tar", ["-xOzf", entry.path, "--", "package/package.json"], root));
  if (manifest.name !== entry.name || manifest.version !== entry.version) {
    throw new Error(`The packed manifest does not match preview metadata for ${entry.name}.`);
  }
  return { ...entry, manifest };
}

/** Select the consumer's existing package roots and their preview dependency closure. */
export function selectConsumerPackages(packages, manifests) {
  const available = new Map(packages.map((entry) => [entry.name, entry]));
  const selected = new Map();
  const queue = [...dependencyNames(manifests)];
  while (queue.length) {
    const name = queue.shift();
    if (selected.has(name) || !available.has(name)) continue;
    const entry = available.get(name);
    selected.set(name, entry);
    queue.push(...Object.keys(entry.manifest.dependencies ?? {}), ...Object.keys(entry.manifest.optionalDependencies ?? {}));
  }
  return [...selected.values()];
}

function checkLockfile(lockfile, packages, root) {
  for (const entry of packages) {
    const nodes = Object.entries(lockfile.packages ?? {}).filter(([path]) => path.endsWith(`node_modules/${entry.name}`));
    if (nodes.length === 0 || nodes.some(([, node]) => node.version !== entry.version ||
      typeof node.resolved !== "string" || !node.resolved.startsWith("file:") ||
      resolve(root, decodeURIComponent(node.resolved.slice(5))) !== entry.path)) {
      throw new Error(`The temporary lockfile does not consistently use the preview for ${entry.name}.`);
    }
  }
}

/** Verify every selected artefact, then prepare a temporary manifest and lockfile for npm ci. */
export async function installPreviews(selections, root, execute = run) {
  if (selections.length === 0) return [];
  const packages = [];
  for (const selection of selections) {
    const source = Object.hasOwn(sources, selection.key) ? sources[selection.key] : undefined;
    if (!source || selection.repository !== source.repository) throw new Error("Unsupported preview producer.");
    const entries = await verifyPreview(selection.directory, source, selection.sha);
    packages.push(...entries.map((entry) => readArchive(entry, execute, root)));
  }
  const manifestPath = join(root, "package.json");
  const lockPath = join(root, "package-lock.json");
  const originalManifest = await readFile(manifestPath, "utf8");
  const originalLock = await readFile(lockPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  const manifest = JSON.parse(originalManifest);
  const manifests = [manifest];
  if (manifest.workspaces) {
    const workspaceManifests = JSON.parse(execute("npm", ["pkg", "get", "dependencies", "devDependencies", "optionalDependencies", "--workspaces", "--json"], root));
    manifests.push(...Object.values(workspaceManifests));
  }
  const selected = selectConsumerPackages(packages, manifests);
  for (const selection of selections) {
    if (!selected.some((entry) => sources[selection.key].packages.includes(entry.name))) {
      throw new Error(`The consumer does not use any package from ${selection.repository}.`);
    }
  }
  for (const entry of selected) {
    const field = ["dependencies", "devDependencies", "optionalDependencies"].find((name) => Object.hasOwn(manifest[name] ?? {}, entry.name)) ?? "devDependencies";
    (manifest[field] ??= {})[entry.name] = `file:${entry.path}`;
    const overrides = manifest.overrides ??= {};
    const previous = overrides[entry.name];
    overrides[entry.name] = previous && typeof previous === "object"
      ? { ...previous, ".": `$${entry.name}` }
      : `$${entry.name}`;
  }
  const indent = originalManifest.match(/\n([\t ]+)"/u)?.[1] ?? "  ";
  try {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, indent)}\n`);
    execute("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], root);
    checkLockfile(JSON.parse(await readFile(lockPath, "utf8")), selected, root);
  } catch (error) {
    await writeFile(manifestPath, originalManifest);
    if (originalLock === undefined) await rm(lockPath, { force: true });
    else await writeFile(lockPath, originalLock);
    throw error;
  }
  return selected;
}

async function main() {
  const selections = JSON.parse(await readFile(process.env.PREVIEW_PLAN, "utf8"));
  const installed = await installPreviews(selections, process.cwd());
  const lines = ["### Library package previews", ""];
  for (const selection of selections) {
    lines.push(`- ${selection.repository} at \`${selection.sha}\` (${selection.ownership}); ` +
      `[run ${selection.runId}, attempt ${selection.runAttempt}](https://github.com/${selection.repository}/actions/runs/${selection.runId}), artefact ID \`${selection.artifactId}\` (package build attempt ${selection.artifactAttempt}).`);
  }
  for (const entry of installed) lines.push(`- \`${entry.name}@${entry.version}\`: SHA-256 \`${entry.sha256}\`.`);
  if (!selections.length) lines.push("No library previews selected; retaining committed dependencies.");
  else lines.push("", "The manifest and lockfile changes apply only to this CI checkout. Run npm ci next.");
  const summary = `${lines.join("\n")}\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
