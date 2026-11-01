import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
import ts from "typescript";

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

test("README generation retains the operation scope and asyncQueue guidance", async () => {
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

    assert.match(readme, /^## Operation scopes$/m);
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

test("documents focused resource APIs while preserving existing reference URLs", async () => {
  const root = await mkdtemp(join(tmpdir(), "fancy-kit-octagonal-docs-"));
  const output = join(root, "docs");
  try {
    const args = [
      "run",
      "doc",
      "--workspace",
      "octagonal-wheels",
      "--",
      "--out",
      output,
    ];
    const command = process.env.npm_execpath
      ? process.execPath
      : process.platform === "win32"
        ? "npm.cmd"
        : "npm";
    const invocation = process.env.npm_execpath
      ? [process.env.npm_execpath, ...args]
      : args;
    const result = spawnSync(command, invocation, {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, npm_config_offline: "true" },
      timeout: 60_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);

    for (const reference of [
      "resource/scope/withScope/README.md",
      "resource/scope/scoped/README.md",
      "resource/scope/Scope/README.md",
      "resource/scope/ScopedPipeline/README.md",
      "resource/DisposableResource/README.md",
      "resource/OwnedResource/README.md",
      "resource/createOwnedResource/README.md",
      "resource/withOwnedResource/README.md",
      "libVersion/README.md",
      "concurrency/notifier/createNotifier/README.md",
      "iterable/asyncQueue/createAsyncQueue/README.md",
      "modification/ModificationHandlerAdapter/README.md",
    ]) {
      const content = await readFile(join(output, reference), "utf8");
      assert.ok(content.length > 0, `Missing API reference: ${reference}`);
    }

    for (const [legacy, current] of [
      ["collection/TypedArrayReader", "binary/TypedArrayReader"],
      ["collection/concatUInt8Array", "binary/concatUInt8Array"],
      ["collection/createTypedArrayReader", "binary/createTypedArrayReader"],
      ["object/decodeAnyArray", "encoding/decodeAnyArray"],
      ["object/encodeAnyArray", "encoding/encodeAnyArray"],
    ]) {
      const content = await readFile(join(output, legacy, "README.md"), "utf8");
      assert.ok(content.includes(`../../${current}/README.md`));
      assert.ok(
        (await readFile(join(output, current, "README.md"), "utf8")).length > 0,
      );
    }

    const backend = await readFile(
      join(output, "BackedQueue/QueueBackend/QueueBackend/README.md"),
      "utf8",
    );
    assert.doesNotMatch(backend, /,[ \t]+$/m);

    const log = result.stdout + result.stderr;
    for (const symbol of ["Scope", "ScopedStep", "Awaitable", "MaybePromise"]) {
      assert.equal(log.includes(`[warning] ${symbol}, defined`), false, log);
    }
    for (const symbol of ["String.split", "Array.join"]) {
      assert.equal(
        log
          .split("\n")
          .some((line) => line.includes("[warning]") && line.includes(symbol)),
        false,
        log,
      );
    }
    const adapter = await readFile(
      join(output, "modification/ModificationHandlerAdapter/README.md"),
      "utf8",
    );
    assert.doesNotMatch(adapter, /MaybePromise/);
    assert.match(adapter, /PromiseLike/);
    const split = await readFile(
      join(output, "string/splitDelimitedList/README.md"),
      "utf8",
    );
    const joined = await readFile(
      join(output, "string/joinDelimitedList/README.md"),
      "utf8",
    );
    assert.ok(
      split.includes(
        "https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.split",
      ),
    );
    assert.ok(
      joined.includes(
        "https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.join",
      ),
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("type-checks the notifier and semaphore TSDoc examples", async () => {
  const root = await createGeneratorFixture("fancy-kit-tsdoc-examples-");
  try {
    const examples = [];
    for (const module of [
      "concurrency/coalescingNotifier",
      "concurrency/semaphore.scoped",
    ]) {
      const source = await readFile(
        join(packageDirectory, "src", `${module}.ts`),
        "utf8",
      );
      const example = source.match(/ \* ```ts\n([\s\S]*?) \* ```/);
      assert.ok(example, `Missing fenced example in ${module}`);
      const target = join(root, `${module.split("/").at(-1)}.ts`);
      await writeFile(target, example[1].replace(/^ \* ?/gm, ""));
      examples.push(target);
    }
    const program = ts.createProgram(examples, {
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2020,
      lib: ["lib.es2020.d.ts"],
      types: [],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: (value) => value,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
