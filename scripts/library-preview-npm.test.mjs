import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { sources } from "../.github/actions/install-library-preview/contract.mjs";
import { installPreviews } from "../.github/actions/install-library-preview/install.mjs";

const sha = "a".repeat(40);

async function fixture(t, workspace = false) {
  const root = await mkdtemp(join(tmpdir(), "library-preview-npm-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const consumer = join(root, "consumer");
  await mkdir(consumer);
  const selections = [];
  for (const key of ["commonlib", "kit"]) {
    const directory = join(root, key);
    await mkdir(directory);
    const entries = [];
    for (const name of sources[key].packages) {
      const staging = join(root, "staging", name.replace("@vrtmrz/", ""));
      await mkdir(join(staging, "package"), { recursive: true });
      const dependencies = name === "@vrtmrz/livesync-commonlib" ? { "octagonal-wheels": "1.0.0" }
        : name === "@vrtmrz/obsidian-plugin-kit" ? { "@vrtmrz/ui-interactions": "1.0.0" } : undefined;
      const manifest = { name, version: "2.0.0", type: "module", exports: "./index.js", ...(dependencies ? { dependencies } : {}) };
      await writeFile(join(staging, "package/package.json"), JSON.stringify(manifest));
      await writeFile(join(staging, "package/index.js"), `export default ${JSON.stringify(`preview:${name}`)};\n`);
      const file = `${name.replace("@vrtmrz/", "")}.tgz`;
      execFileSync("tar", ["-czf", join(directory, file), "-C", staging, "package"]);
      entries.push({ name, version: manifest.version, file,
        sha256: createHash("sha256").update(await readFile(join(directory, file))).digest("hex") });
    }
    await writeFile(join(directory, "preview.json"), JSON.stringify({ schemaVersion: 1, repository: sources[key].repository, sha, packages: entries }));
    selections.push({ key, repository: sources[key].repository, sha, directory });
  }
  const dependencies = { "@vrtmrz/livesync-commonlib": "1.0.0", "@vrtmrz/obsidian-plugin-kit": "1.0.0" };
  const manifest = { name: "consumer", version: "1.0.0", private: true, type: "module",
    ...(workspace ? { workspaces: ["app"] } : { dependencies }) };
  if (workspace) {
    await mkdir(join(consumer, "app"));
    await writeFile(join(consumer, "app/package.json"), JSON.stringify({ name: "consumer-app", version: "1.0.0", private: true, dependencies }));
  }
  await writeFile(join(consumer, "package.json"), `${JSON.stringify(manifest)}\n`);
  await writeFile(join(consumer, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": manifest } }));
  return { root, consumer, selections, manifest };
}

for (const workspace of [false, true]) {
  test(`npm ci installs only the requested previews and their dependency closure${workspace ? " across workspaces" : ""}`, async (t) => {
    const { root, consumer, selections } = await fixture(t, workspace);
    const environment = { ...process.env, npm_config_cache: join(root, "cache"), npm_config_offline: "true" };
    const execute = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: "utf8", env: environment });
    const installed = await installPreviews(selections, consumer, execute);
    assert.deepEqual(new Set(installed.map((entry) => entry.name)), new Set([
      "@vrtmrz/livesync-commonlib", "@vrtmrz/obsidian-plugin-kit", "octagonal-wheels", "@vrtmrz/ui-interactions",
    ]));
    execute("npm", ["ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"], consumer);
    const imports = execute(process.execPath, ["--input-type=module", "-e",
      "import commonlib from '@vrtmrz/livesync-commonlib'; import kit from '@vrtmrz/obsidian-plugin-kit'; import utility from 'octagonal-wheels'; import ui from '@vrtmrz/ui-interactions'; console.log(JSON.stringify([commonlib,kit,utility,ui]));"], consumer);
    assert.deepEqual(JSON.parse(imports), ["preview:@vrtmrz/livesync-commonlib", "preview:@vrtmrz/obsidian-plugin-kit", "preview:octagonal-wheels", "preview:@vrtmrz/ui-interactions"]);
    await assert.rejects(readFile(join(consumer, "node_modules/@vrtmrz/secret-store/package.json")), { code: "ENOENT" });
  });
}

test("failed npm resolution restores both consumer files exactly", async (t) => {
  const { consumer, selections } = await fixture(t);
  const originalManifest = await readFile(join(consumer, "package.json"), "utf8");
  const originalLock = await readFile(join(consumer, "package-lock.json"), "utf8");
  const execute = (command, args, cwd) => {
    if (command === "npm" && args[0] === "install") throw new Error("injected resolution failure");
    return execFileSync(command, args, { cwd, encoding: "utf8" });
  };
  await assert.rejects(installPreviews(selections, consumer, execute), /injected resolution failure/);
  assert.equal(await readFile(join(consumer, "package.json"), "utf8"), originalManifest);
  assert.equal(await readFile(join(consumer, "package-lock.json"), "utf8"), originalLock);
});
