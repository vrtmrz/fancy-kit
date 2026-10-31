import assert from "node:assert/strict";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const packageDirectory = join(repositoryRoot, "packages/octagonal-wheels");

async function createGeneratorFixture(prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await symlink(
    join(repositoryRoot, "node_modules"),
    join(root, "node_modules"),
    "dir",
  );
  return root;
}

async function runGeneratorInFixture(root, generator) {
  const previousCwd = process.cwd();
  const previousLog = console.log;
  process.chdir(root);
  console.log = () => {};
  try {
    await import(
      `${pathToFileURL(join(root, generator)).href}?fixture=${Date.now()}`
    );
  } finally {
    console.log = previousLog;
    process.chdir(previousCwd);
  }
}

test("generates directory index aliases without treating dotted basenames as directories", async () => {
  const root = await createGeneratorFixture("fancy-kit-glob-dist-");
  try {
    await mkdir(join(root, "dist/collection"), { recursive: true });
    for (const module of [
      "index",
      "collection/index",
      "collection.index",
      "concurrency.internal",
      "concurrency.deprecated",
    ]) {
      await writeFile(join(root, `dist/${module}.js`), "export {};\n");
      await writeFile(join(root, `dist/${module}.d.ts`), "export {};\n");
    }
    await writeFile(join(root, "package.json"), '{"type":"module"}\n');
    await copyFile(
      join(packageDirectory, "globDist.mjs"),
      join(root, "globDist.mjs"),
    );

    await runGeneratorInFixture(root, "globDist.mjs");
    const { exports } = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    );

    assert.equal(exports["./collection"].import, "./dist/collection/index.js");
    assert.equal(
      exports["./collection.js"].import,
      "./dist/collection/index.js",
    );
    assert.equal(
      exports["./collection/index.js"].import,
      "./dist/collection/index.js",
    );
    assert.equal(
      exports["./collection.index"].import,
      "./dist/collection.index.js",
    );
    assert.equal(
      exports["./collection.index.js"].import,
      "./dist/collection.index.js",
    );
    assert.equal(exports["./collection.index/index.js"], undefined);
    assert.equal(exports["./concurrency.internal"], undefined);
    assert.equal(exports["./concurrency.deprecated"], undefined);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("README generation retains the execution-scope and asyncQueue guidance", async () => {
  const root = await mkdtemp(join(tmpdir(), "fancy-kit-octagonal-readme-"));
  try {
    await mkdir(join(root, "coverage"), { recursive: true });
    await Promise.all([
      copyFile(
        join(packageDirectory, "README.src.md"),
        join(root, "README.src.md"),
      ),
      copyFile(
        join(packageDirectory, "updateReadme.js"),
        join(root, "updateReadme.js"),
      ),
      writeFile(
        join(root, "coverage/coverage-text.txt"),
        "Fixture coverage.\n",
      ),
    ]);

    await runGeneratorInFixture(root, "updateReadme.js");
    const readme = await readFile(join(root, "README.md"), "utf8");

    assert.match(readme, /^## Execution scopes$/m);
    assert.equal(
      readme,
      await readFile(join(packageDirectory, "README.md"), "utf8"),
    );
    assert.match(readme, /concurrency\/scoped\.iteration/);
    assert.doesNotMatch(readme, /concurrency\/scopedIteration/);
    assert.match(readme, /iterable\/asyncQueue/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
