import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

/** Fixed producers and package sets; callers select a revision, never a destination. */
export const sources = Object.freeze({
  commonlib: {
    repository: "vrtmrz/livesync-commonlib",
    workflow: "package-ci.yml",
    packages: ["@vrtmrz/livesync-commonlib"],
  },
  kit: {
    repository: "vrtmrz/fancy-kit",
    workflow: "ci.yml",
    packages: [
      "@vrtmrz/value-store",
      "@vrtmrz/secret-store",
      "@vrtmrz/secret-store-node",
      "@vrtmrz/ui-interactions",
      "@vrtmrz/browser-ui-kit",
      "@vrtmrz/obsidian-plugin-kit",
      "@vrtmrz/obsidian-test-session",
      "octagonal-wheels",
    ],
  },
});

/** Reject mutable refs and shell fragments before any network or filesystem work. */
export function validateSha(sha) {
  if (typeof sha !== "string" || !/^[a-f0-9]{40}$/u.test(sha)) {
    throw new Error("A preview revision must be a full 40-character lowercase commit SHA.");
  }
  return sha;
}

/** Restrict archive paths to ordinary npm tarball basenames. */
export function validateFilename(filename) {
  if (typeof filename !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._+-]*\.tgz$/u.test(filename)) {
    throw new Error("A preview package file must be a tarball basename.");
  }
  return filename;
}

/** Hash a regular file without loading a complete package into memory. */
export async function hashPackage(path) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size === 0 || stat.size > 100 * 1024 * 1024) {
    throw new Error("A preview tarball must be a regular file between 1 byte and 100 MiB.");
  }
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

/** Check the complete producer set and source identity before accepting any paths. */
export function validateManifest(manifest, source, sha) {
  validateSha(sha);
  if (manifest?.schemaVersion !== 1 || manifest.repository !== source.repository || manifest.sha !== sha) {
    throw new Error("Preview metadata does not match the requested repository and commit.");
  }
  if (!Array.isArray(manifest.packages) || manifest.packages.length !== source.packages.length) {
    throw new Error("Preview metadata must contain the complete producer package set.");
  }
  const names = new Set();
  const filenames = new Set();
  for (const entry of manifest.packages) {
    if (!source.packages.includes(entry?.name) || names.has(entry.name)) {
      throw new Error("Preview metadata contains an unexpected or repeated package.");
    }
    validateFilename(entry.file);
    if (filenames.has(entry.file)) throw new Error("Preview metadata repeats a tarball filename.");
    if (typeof entry.version !== "string" || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/u.test(entry.version)) {
      throw new Error("Preview metadata has an invalid package version.");
    }
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      throw new Error("Preview metadata has an invalid SHA-256 digest.");
    }
    names.add(entry.name);
    filenames.add(entry.file);
  }
  return manifest.packages;
}

/** Verify all downloaded bytes before the consumer manifest or lockfile changes. */
export async function verifyPreview(directory, source, sha) {
  const metadataPath = join(directory, "preview.json");
  const stat = await lstat(metadataPath);
  if (!stat.isFile() || stat.size > 64 * 1024) throw new Error("Invalid preview metadata file.");
  const entries = validateManifest(JSON.parse(await readFile(metadataPath, "utf8")), source, sha);
  const expected = new Set(["preview.json", ...entries.map((entry) => entry.file)]);
  const files = await readdir(directory);
  if (files.length !== expected.size || files.some((file) => !expected.has(file))) {
    throw new Error("The preview artefact contains unexpected files.");
  }
  for (const entry of entries) {
    if (await hashPackage(join(directory, entry.file)) !== entry.sha256) {
      throw new Error(`SHA-256 mismatch for ${entry.name}.`);
    }
  }
  return entries.map((entry) => ({ ...entry, path: join(directory, entry.file) }));
}
