import { execFileSync } from "node:child_process";
import { appendFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { hashPackage, sources, validateFilename, validateManifest, validateSha } from "../.github/actions/install-library-preview/contract.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Pack the already validated workspace into a separate, initially empty artefact directory. */
export async function createPackagePreview(root, directory, execute = execFileSync) {
  root = resolve(root);
  directory = resolve(directory);
  const relativeDirectory = relative(root, directory);
  if (!relativeDirectory || (!(relativeDirectory === ".." || relativeDirectory.startsWith(`..${sep}`)) && !isAbsolute(relativeDirectory))) {
    throw new Error("The preview directory must be outside the source checkout.");
  }
  const sha = validateSha(execute("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim());
  await mkdir(directory, { recursive: true });
  if (!(await lstat(directory)).isDirectory() || (await readdir(directory)).length) {
    throw new Error("The preview directory must be an empty ordinary directory.");
  }
  const packed = JSON.parse(execute("npm", ["pack", "--json", "--ignore-scripts", "--workspaces", "--pack-destination", directory],
    { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 }));
  const packages = [];
  for (const entry of packed) {
    if (!sources.kit.packages.includes(entry.name)) throw new Error("Unexpected workspace package in the preview.");
    validateFilename(entry.filename);
    const source = JSON.parse(await readFile(join(root, "packages", entry.name.replace(/^@vrtmrz\//u, ""), "package.json"), "utf8"));
    if (source.name !== entry.name || source.version !== entry.version || source.private === true) {
      throw new Error("Packed metadata does not match a publishable workspace package.");
    }
    packages.push({ name: entry.name, version: entry.version, file: entry.filename,
      sha256: await hashPackage(join(directory, entry.filename)) });
  }
  const manifest = { schemaVersion: 1, repository: sources.kit.repository, sha, packages };
  validateManifest(manifest, sources.kit, sha);
  await writeFile(join(directory, "preview.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main() {
  const directory = process.env.PREVIEW_DIRECTORY;
  if (!directory) throw new Error("PREVIEW_DIRECTORY is required.");
  const manifest = await createPackagePreview(repositoryRoot, directory);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `sha=${manifest.sha}\ndirectory=${resolve(directory)}\n`);
  console.log(`Prepared ${manifest.packages.length} package previews from ${manifest.sha}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
