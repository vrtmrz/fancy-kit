#!/usr/bin/env node
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const requireFromOctagonal = createRequire(
  join(repositoryRoot, "packages/octagonal-wheels/package.json"),
);
const { chromium } = requireFromOctagonal("playwright");
const { build } = requireFromOctagonal("esbuild");

const stringCases = [
  { key: "", value: "non-empty value at the empty key" },
  { key: "nul\u0000key", value: "left\u0000right" },
  { key: "bom\uFEFFkey", value: "\uFEFF" },
  { key: "high-\uD800", value: "\uD800" },
  { key: "low-\uDC00", value: "\uDC00" },
  { key: "pair-\uD83D\uDE03", value: "pair-\uD83D\uDE03" },
  { key: "composed-\u00E9", value: "e\u0301" },
  { key: "decomposed-e\u0301", value: "\u00E9" },
  { key: "text-zero", value: "0" },
  { key: "text-false", value: "false" },
  { key: "literal-x%2F", value: "literal prefix and key" },
];

const objectCases = [
  { key: "null", value: null },
  { key: "false", value: false },
  { key: "zero", value: 0 },
  { key: "empty-string", value: "" },
  { key: "nested", value: { text: "value", nested: [false, 0, "", null, { flag: false }] } },
  { key: "array", value: [null, false, 0, "", ["nested"]] },
];

const encryptedObject = {
  marker: "browser-encrypted-sentinel-7b60d1",
  nested: ["confidential string", false, 0, ""],
};
const testPassphrase = "synthetic-browser-local-storage-passphrase";

function codeUnits(value) {
  return Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));
}

function listen(server) {
  return new Promise((resolvePromise, rejectPromise) => {
    const onError = (error) => rejectPromise(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolvePromise();
    });
  });
}

function closeServer(server) {
  if (!server?.listening) {
    return Promise.resolve();
  }
  return new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => {
      if (error) {
        rejectPromise(error);
      } else {
        resolvePromise();
      }
    });
  });
}

function makeServer(bundle) {
  const html = Buffer.from("<!doctype html><meta charset=\"utf-8\"><title>value store browser test</title>");
  const server = createServer((request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    if (request.url === "/") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(html);
      return;
    }

    if (request.url === "/web-storage.js") {
      response.writeHead(200, {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(bundle);
      return;
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  return server;
}

async function openProfilePage(userDataDirectory, origin) {
  const context = await chromium.launchPersistentContext(userDataDirectory, {
    executablePath: chromium.executablePath(),
    headless: true,
  });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto(origin, { waitUntil: "load" });
    return { context, page };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

async function main() {
  const executable = chromium.executablePath();
  assert.ok(
    existsSync(executable),
    `Chromium executable is missing at ${executable}; install it with ` +
      "`npm exec --workspace octagonal-wheels -- playwright install chromium`.",
  );

  const temporaryRoot = await mkdtemp(join(tmpdir(), "fancy-kit-value-store-browser-"));
  const userDataDirectory = join(temporaryRoot, "chromium-profile");
  let server;
  let context;
  let failure;
  const cleanupErrors = [];

  try {
    const bundlePath = join(temporaryRoot, "web-storage.js");
    await build({
      entryPoints: [join(scriptDirectory, "browser-entry.ts")],
      alias: {
        "octagonal-wheels/encryption/hkdf": join(
          repositoryRoot,
          "packages/octagonal-wheels/src/encryption/hkdf.ts",
        ),
      },
      bundle: true,
      platform: "browser",
      format: "esm",
      target: "es2022",
      outfile: bundlePath,
      logLevel: "silent",
    });
    const bundle = await readFile(bundlePath);

    server = makeServer(bundle);
    await listen(server);
    const address = server.address();
    assert.ok(address && typeof address !== "string", "The local HTTP server did not bind a TCP port.");
    const origin = `http://127.0.0.1:${address.port}/`;

    const firstSession = await openProfilePage(userDataDirectory, origin);
    context = firstSession.context;

    const firstResults = await firstSession.page.evaluate(async ({ strings, objects, secret, passphrase }) => {
      const {
        createWebStorageValueStore,
        createOwHkdfSerializer,
        HKDF_SALTED_ENCRYPTED_PREFIX,
      } = await import("/web-storage.js");
      const units = (value) => value === null
        ? null
        : Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));

      const stringStore = createWebStorageValueStore(window.localStorage, { prefix: "strings:" });
      const stringValues = [];
      for (const { key, value } of strings) {
        await stringStore.setValue(key, value);
        stringValues.push({
          value: units(await stringStore.getValue(key)),
          rawValue: units(window.localStorage.getItem("strings:" + key)),
        });
      }

      await stringStore.setValue("empty-write", "present");
      await stringStore.setValue("empty-write", "");
      await stringStore.setValue("explicit-empty-delete", "present");
      await stringStore.delete("explicit-empty-delete");
      window.localStorage.setItem("strings:external-empty", "");
      const emptyValueWrite = {
        value: await stringStore.getValue("empty-write"),
        rawValue: window.localStorage.getItem("strings:empty-write"),
      };
      const explicitEmptyDelete = {
        value: await stringStore.getValue("explicit-empty-delete"),
        rawValue: window.localStorage.getItem("strings:explicit-empty-delete"),
      };
      const externalRawEmpty = await stringStore.getValue("external-empty");

      const objectStore = createWebStorageValueStore(window.localStorage, { prefix: "objects:" });
      const objectValues = [];
      for (const { key, value } of objects) {
        await objectStore.setObject(key, value);
        objectValues.push({
          value: await objectStore.getObject(key),
          rawValue: window.localStorage.getItem("objects:" + key),
        });
      }
      const missingObject = await objectStore.getObject("not-present");

      const firstPrefix = createWebStorageValueStore(window.localStorage, { prefix: "first:" });
      const secondPrefix = createWebStorageValueStore(window.localStorage, { prefix: "second:" });
      await firstPrefix.setValue("shared", "first value");
      await secondPrefix.setValue("shared", "second value");
      const separatedBeforeDelete = [
        await firstPrefix.getValue("shared"),
        await secondPrefix.getValue("shared"),
      ];
      await firstPrefix.delete("shared");

      const serializer = createOwHkdfSerializer(() => passphrase);
      const encryptedStore = createWebStorageValueStore(window.localStorage, {
        prefix: "encrypted:",
        serializer,
      });
      await encryptedStore.setObject("record", secret);
      const ciphertext = window.localStorage.getItem("encrypted:record");
      const encryptedRoundTrip = await encryptedStore.getObject("record");

      return {
        stringValues,
        emptyKeyRaw: window.localStorage.getItem("strings:"),
        emptyValueWrite,
        explicitEmptyDelete,
        externalRawEmpty,
        missingValue: await stringStore.getValue("not-present"),
        objectValues,
        missingObjectWasUndefined: missingObject === undefined,
        separatedBeforeDelete,
        firstAfterDelete: await firstPrefix.getValue("shared"),
        firstRawAfterDelete: window.localStorage.getItem("first:shared"),
        secondAfterDelete: await secondPrefix.getValue("shared"),
        ciphertext,
        encryptedPrefix: HKDF_SALTED_ENCRYPTED_PREFIX,
        encryptedRoundTrip,
      };
    }, {
      strings: stringCases,
      objects: objectCases,
      secret: encryptedObject,
      passphrase: testPassphrase,
    });

    assert.equal(firstResults.stringValues.length, stringCases.length);
    for (const [index, sample] of stringCases.entries()) {
      const actual = firstResults.stringValues[index];
      assert.deepEqual(actual.value, codeUnits(sample.value));
      assert.deepEqual(actual.rawValue, codeUnits(sample.value));
    }
    assert.equal(firstResults.emptyKeyRaw, stringCases[0].value);
    assert.deepEqual(firstResults.emptyValueWrite, { value: "", rawValue: "" });
    assert.deepEqual(firstResults.explicitEmptyDelete, { value: null, rawValue: null });
    assert.equal(firstResults.externalRawEmpty, "");
    assert.equal(firstResults.missingValue, null);

    assert.equal(firstResults.objectValues.length, objectCases.length);
    for (const [index, sample] of objectCases.entries()) {
      const actual = firstResults.objectValues[index];
      assert.deepEqual(actual.value, sample.value);
      assert.equal(actual.rawValue, JSON.stringify(sample.value));
    }
    assert.equal(firstResults.missingObjectWasUndefined, true);
    assert.deepEqual(firstResults.separatedBeforeDelete, ["first value", "second value"]);
    assert.equal(firstResults.firstAfterDelete, null);
    assert.equal(firstResults.firstRawAfterDelete, null);
    assert.equal(firstResults.secondAfterDelete, "second value");

    assert.equal(typeof firstResults.ciphertext, "string");
    assert.ok(firstResults.ciphertext.startsWith(firstResults.encryptedPrefix));
    assert.equal(firstResults.ciphertext.includes(JSON.stringify(encryptedObject)), false);
    assert.equal(firstResults.ciphertext.includes(encryptedObject.marker), false);
    assert.equal(firstResults.ciphertext.includes("confidential string"), false);
    assert.deepEqual(firstResults.encryptedRoundTrip, encryptedObject);

    await context.close();
    context = undefined;

    const reopenedSession = await openProfilePage(userDataDirectory, origin);
    context = reopenedSession.context;
    const persistedResults = await reopenedSession.page.evaluate(async ({ strings, objects, passphrase }) => {
      const {
        createWebStorageValueStore,
        createOwHkdfSerializer,
      } = await import("/web-storage.js");
      const units = (value) => value === null
        ? null
        : Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));

      const stringStore = createWebStorageValueStore(window.localStorage, { prefix: "strings:" });
      const objectStore = createWebStorageValueStore(window.localStorage, { prefix: "objects:" });
      const encryptedStore = createWebStorageValueStore(window.localStorage, {
        prefix: "encrypted:",
        serializer: createOwHkdfSerializer(() => passphrase),
      });
      const missingObject = await objectStore.getObject("not-present");

      return {
        stringValues: await Promise.all(strings.map(async ({ key }) =>
          units(await stringStore.getValue(key)))),
        missingValue: await stringStore.getValue("not-present"),
        objectValues: await Promise.all(objects.map(async ({ key }) =>
          objectStore.getObject(key))),
        missingObjectWasUndefined: missingObject === undefined,
        emptyValueWrite: await stringStore.getValue("empty-write"),
        explicitEmptyDelete: await stringStore.getValue("explicit-empty-delete"),
        externalRawEmpty: await stringStore.getValue("external-empty"),
        firstDeleted: await createWebStorageValueStore(window.localStorage, { prefix: "first:" })
          .getValue("shared"),
        secondValue: await createWebStorageValueStore(window.localStorage, { prefix: "second:" })
          .getValue("shared"),
        ciphertext: window.localStorage.getItem("encrypted:record"),
        encryptedRoundTrip: await encryptedStore.getObject("record"),
      };
    }, {
      strings: stringCases,
      objects: objectCases,
      passphrase: testPassphrase,
    });

    assert.deepEqual(persistedResults.stringValues, stringCases.map(({ value }) => codeUnits(value)));
    assert.equal(persistedResults.missingValue, null);
    assert.deepEqual(persistedResults.objectValues, objectCases.map(({ value }) => value));
    assert.equal(persistedResults.missingObjectWasUndefined, true);
    assert.equal(persistedResults.emptyValueWrite, "");
    assert.equal(persistedResults.explicitEmptyDelete, null);
    assert.equal(persistedResults.externalRawEmpty, "");
    assert.equal(persistedResults.firstDeleted, null);
    assert.equal(persistedResults.secondValue, "second value");
    assert.equal(persistedResults.ciphertext, firstResults.ciphertext);
    assert.deepEqual(persistedResults.encryptedRoundTrip, encryptedObject);

    console.log(
      "Web Storage Chromium integration passed: exact UTF-16 strings, raw strings, JSON object values, " +
        "empty-value preservation and explicit deletion, literal prefixes, encrypted round-trip, and profile persistence after restart.",
    );
  } catch (error) {
    failure = error;
  } finally {
    try {
      if (context) {
        await context.close();
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await closeServer(server);
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await rm(temporaryRoot, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (failure) {
    for (const error of cleanupErrors) {
      console.error("Cleanup also failed:", error);
    }
    throw failure;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "Browser integration cleanup failed.");
  }
}

await main();
