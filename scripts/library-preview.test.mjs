import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { sources, validateManifest, verifyPreview } from "../.github/actions/install-library-preview/contract.mjs";
import { installPreviews, selectConsumerPackages } from "../.github/actions/install-library-preview/install.mjs";
import { githubApi, selectPreview, selectPreviews } from "../.github/actions/install-library-preview/select.mjs";
import { createPackagePreview } from "./create-package-preview.mjs";

const sha = "a".repeat(40);
const repository = sources.commonlib.repository;
const metadata = (packages) => ({ schemaVersion: 1, repository, sha, packages });
const entry = () => ({ name: "@vrtmrz/livesync-commonlib", version: "0.1.44", file: "commonlib.tgz", sha256: "b".repeat(64) });

function githubFixture(overrides = {}) {
  const calls = [];
  const run = { id: 12, workflow_id: 8, run_attempt: 2, status: "completed", conclusion: "success", event: "push",
    head_sha: sha, repository: { full_name: repository }, head_repository: { full_name: repository } };
  const artifact = { id: 30, name: `package-preview-${sha}-2`, expired: false, expires_at: "2999-01-01T00:00:00Z" };
  const api = async (path) => {
    calls.push(path);
    if (path.includes("/compare/")) return overrides.comparison ?? { status: "ahead", merge_base_commit: { sha } };
    if (path.includes("/pulls?")) return overrides.pulls ?? [];
    if (path.endsWith("/workflows/package-ci.yml")) return { id: 8, path: ".github/workflows/package-ci.yml" };
    if (path.includes("/runs?")) return { workflow_runs: overrides.runs ?? [{ ...run, ...overrides.run }] };
    if (path.includes("/artifacts?")) return { artifacts: overrides.artifacts ?? [{ ...artifact, ...overrides.artifact }] };
    throw new Error(`Unexpected request: ${path}`);
  };
  return { api, calls, run, artifact };
}

test("blank inputs use the committed dependency set without API requests", async () => {
  assert.deepEqual(await selectPreviews({ commonlib: "", kit: "" }, () => assert.fail("Unexpected network access")), []);
});

test("both revisions are checked before any API request", async () => {
  for (const invalid of ["main", "a".repeat(7), "A".repeat(40), `${sha}\n`, "https://example.com/package.tgz", "$(touch marker)"]) {
    await assert.rejects(selectPreviews({ commonlib: sha, kit: invalid }, () => assert.fail("Unexpected network access")), /full 40-character/);
  }
});

test("selects the immutable ID from a successful fixed-repository workflow", async () => {
  const fixture = githubFixture();
  const result = await selectPreview("commonlib", sha, fixture.api);
  assert.deepEqual(result, { key: "commonlib", repository, sha, ownership: "main", runId: 12, runAttempt: 2, artifactId: 30, artifactAttempt: 2 });
  assert.ok(fixture.calls.some((path) => path.includes(`/workflows/8/runs?head_sha=${sha}`)));
});

test("CI attempt names retain immutable uploads when a workflow is rerun", async () => {
  const fixture = githubFixture();
  const result = await selectPreview("commonlib", sha, githubFixture({ artifacts: [
    { ...fixture.artifact, name: `package-preview-${sha}-1`, id: 29 },
    { ...fixture.artifact, name: `package-preview-${sha}-2`, id: 30 },
    { ...fixture.artifact, name: `package-preview-${sha}-3`, id: 31 },
  ] }).api);
  assert.equal(result.artifactId, 30);
  assert.equal(result.artifactAttempt, 2);
});

test("CI attempt selection retains an already passed package job during a partial rerun", async () => {
  const fixture = githubFixture({ artifact: { name: `package-preview-${sha}-1` } });
  const result = await selectPreview("commonlib", sha, fixture.api);
  assert.equal(result.runAttempt, 2);
  assert.equal(result.artifactAttempt, 1);
});

test("accepts an exact same-repository open PR head into main", async () => {
  const fixture = githubFixture({ comparison: { status: "behind" }, pulls: [{ state: "open", number: 42,
    head: { sha, repo: { full_name: repository } }, base: { ref: "main", repo: { full_name: repository } } }] });
  assert.equal((await selectPreview("commonlib", sha, fixture.api)).ownership, "pull-request-42");
});

test("rejects foreign, stale, closed, and incorrectly based pull requests", async () => {
  const pull = { state: "open", number: 42, head: { sha, repo: { full_name: repository } }, base: { ref: "main", repo: { full_name: repository } } };
  for (const changed of [
    { state: "closed" }, { head: { ...pull.head, sha: "c".repeat(40) } },
    { head: { ...pull.head, repo: { full_name: "someone/fork" } } },
    { base: { ...pull.base, ref: "other" } }, { base: { ...pull.base, repo: { full_name: "someone/fork" } } },
  ]) {
    const fixture = githubFixture({ comparison: { status: "diverged" }, pulls: [{ ...pull, ...changed }] });
    await assert.rejects(selectPreview("commonlib", sha, fixture.api), /same-repository pull request/);
    assert.ok(!fixture.calls.some((path) => path.includes("/actions/")));
  }
});

test("a workflow success alone does not authorise a different source or event", async () => {
  for (const run of [
    { conclusion: "failure" }, { status: "in_progress" }, { head_sha: "c".repeat(40) },
    { workflow_id: 99 }, { event: "pull_request_target" }, { event: "workflow_run" },
    { repository: { full_name: "someone/other" } }, { head_repository: { full_name: "someone/fork" } },
  ]) {
    const fixture = githubFixture({ run });
    await assert.rejects(selectPreview("commonlib", sha, fixture.api), /no successful CI run/);
    assert.ok(!fixture.calls.some((path) => path.includes("/artifacts?")));
  }
});

test("expired, missing, and ambiguous artefacts fail without a source fallback", async () => {
  for (const artifact of [{ expired: true }, { expires_at: "2000-01-01T00:00:00Z" }, { name: "other" }]) {
    await assert.rejects(selectPreview("commonlib", sha, githubFixture({ artifact }).api), /unexpired package preview/);
  }
  const { artifact } = githubFixture();
  await assert.rejects(selectPreview("commonlib", sha, githubFixture({ artifacts: [artifact, { ...artifact, id: 31 }] }).api), /repeated preview/);
});

test("GitHub token access uses the fixed API host and rejects redirects", async () => {
  const api = githubApi("secret", async (url, options) => {
    assert.equal(url, "https://api.github.com/repos/vrtmrz/fancy-kit");
    assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, "Bearer secret");
    return { ok: true, json: async () => ({ id: 1 }) };
  });
  assert.deepEqual(await api("/repos/vrtmrz/fancy-kit"), { id: 1 });
});

test("metadata rejects wrong sources, incomplete sets, traversal, duplicates, and invalid digests", () => {
  for (const value of [
    { ...metadata([entry()]), sha: "c".repeat(40) }, { ...metadata([entry()]), repository: "someone/fork" },
    metadata([]), metadata([{ ...entry(), file: "../commonlib.tgz" }]),
    metadata([{ ...entry(), name: "unexpected" }]), metadata([{ ...entry(), sha256: "bad" }]),
  ]) assert.throws(() => validateManifest(value, sources.commonlib, sha));
  assert.throws(() => validateManifest(metadata([entry(), entry()]), sources.commonlib, sha));
});

async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), "library-preview-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("verifies downloaded bytes and rejects extra files and symbolic links", async (t) => {
  const directory = await temporary(t);
  const bytes = Buffer.from("packed bytes");
  const packed = { ...entry(), sha256: createHash("sha256").update(bytes).digest("hex") };
  await writeFile(join(directory, packed.file), bytes);
  await writeFile(join(directory, "preview.json"), JSON.stringify(metadata([packed])));
  assert.equal((await verifyPreview(directory, sources.commonlib, sha))[0].name, packed.name);
  await writeFile(join(directory, packed.file), "changed");
  await assert.rejects(verifyPreview(directory, sources.commonlib, sha), /SHA-256 mismatch/);
  await writeFile(join(directory, packed.file), bytes);
  await writeFile(join(directory, "unexpected"), "extra");
  await assert.rejects(verifyPreview(directory, sources.commonlib, sha), /unexpected files/);
  await rm(join(directory, "unexpected"));
  await rm(join(directory, packed.file));
  await symlink(join(directory, "preview.json"), join(directory, packed.file));
  await assert.rejects(verifyPreview(directory, sources.commonlib, sha), /regular file/);
});

test("keeps only used preview packages and their same-snapshot dependencies", () => {
  const packages = [
    { name: "app-adapter", manifest: { dependencies: { core: "0.0.0" } } },
    { name: "core", manifest: { optionalDependencies: { utility: "0.0.0" } } },
    { name: "utility", manifest: {} }, { name: "unused", manifest: {} },
  ];
  assert.deepEqual(selectConsumerPackages(packages, [{ dependencies: { "app-adapter": "old" } }]).map((value) => value.name),
    ["app-adapter", "core", "utility"]);
});

test("blank selections leave the manifest and lockfile byte-for-byte unchanged", async (t) => {
  const root = await temporary(t);
  await writeFile(join(root, "package.json"), "original manifest");
  await writeFile(join(root, "package-lock.json"), "original lockfile");
  assert.deepEqual(await installPreviews([], root, () => assert.fail("Unexpected command")), []);
  assert.equal(await readFile(join(root, "package.json"), "utf8"), "original manifest");
  assert.equal(await readFile(join(root, "package-lock.json"), "utf8"), "original lockfile");
});

test("verification failure occurs before any consumer file changes or npm execution", async (t) => {
  const root = await temporary(t);
  const directory = join(root, "preview");
  await mkdir(directory);
  await writeFile(join(directory, "preview.json"), JSON.stringify(metadata([entry()])));
  await writeFile(join(directory, "commonlib.tgz"), "wrong bytes");
  await writeFile(join(root, "package.json"), "original manifest");
  await assert.rejects(installPreviews([{ key: "commonlib", repository, sha, directory }], root,
    () => assert.fail("Unexpected command")), /SHA-256 mismatch/);
  assert.equal(await readFile(join(root, "package.json"), "utf8"), "original manifest");
});

test("workspace producer records the actual SHA and complete packed package checksums", async (t) => {
  const fixture = await temporary(t);
  const root = join(fixture, "source");
  const output = join(fixture, "output");
  await mkdir(root);
  const packed = [];
  for (const name of sources.kit.packages) {
    const directory = join(root, "packages", name.replace("@vrtmrz/", ""));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "package.json"), JSON.stringify({ name, version: "0.0.0" }));
    packed.push({ name, version: "0.0.0", filename: `${name.replace("@vrtmrz/", "")}.tgz` });
  }
  const manifest = await createPackagePreview(root, output, (command, args) => {
    if (command === "git") return `${sha}\n`;
    assert.ok(args.includes("--ignore-scripts"));
    for (const entry of packed) writeFileSync(join(output, entry.filename), entry.name);
    return JSON.stringify(packed);
  });
  assert.equal(manifest.sha, sha);
  assert.equal((await verifyPreview(output, sources.kit, sha)).length, sources.kit.packages.length);
  await assert.rejects(createPackagePreview(root, join(root, "..hidden")), /outside the source checkout/);
});
