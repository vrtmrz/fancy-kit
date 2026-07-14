import { createHash, webcrypto } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_VAULT_NAME,
  VAULT_STORAGE_KEY,
  assertHarnessDocument,
  createBundleUrl,
  createObsidianUri,
  loadVerifiedBundle,
  parseInstallerRequest,
  readVaultName,
  saveVaultName,
} from "../site/harness/installer-core.mjs";

const harnessDocument = `---
adjustObsidianDir: true
---

\`\`\`screwdriver:.obsidian/plugins/fancy-kit-harness/main.js:plain:0
main
\`\`\`
\`\`\`screwdriver:.obsidian/plugins/fancy-kit-harness/manifest.json:plain:0
manifest
\`\`\`
\`\`\`screwdriver:.obsidian/plugins/fancy-kit-harness/styles.css:plain:0
styles
\`\`\`
`;

test("parses an immutable installer request and derives its mirrored asset", () => {
  const checksum = "a".repeat(64);
  const request = parseInstallerRequest(`?version=0.1.0-rc.1&sha256=${checksum}`);
  assert.deepEqual(request, {
    version: "0.1.0-rc.1",
    checksum,
    tag: "harness-0.1.0-rc.1",
    assetName: "fancy-kit-harness-0.1.0-rc.1-screwdriver.md",
  });
  assert.equal(
    createBundleUrl(request, "https://vrtmrz.github.io/fancy-kit/harness/").href,
    "https://vrtmrz.github.io/fancy-kit/harness/releases/harness-0.1.0-rc.1/fancy-kit-harness-0.1.0-rc.1-screwdriver.md",
  );
});

test("rejects incomplete or malformed installer requests", () => {
  assert.throws(() => parseInstallerRequest("?version=latest&sha256=abc"));
  assert.throws(() => parseInstallerRequest("?version=0.1.0"));
  assert.throws(() =>
    parseInstallerRequest(`?version=0.1.0%2Fother&sha256=${"a".repeat(64)}`),
  );
});

test("uses and saves a local kebab-case default Vault name", () => {
  const values = new Map();
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
  assert.equal(readVaultName(storage), DEFAULT_VAULT_NAME);
  assert.equal(DEFAULT_VAULT_NAME, "fancy-kit-harness");
  assert.equal(saveVaultName(storage, "  review-vault  "), "review-vault");
  assert.equal(values.get(VAULT_STORAGE_KEY), "review-vault");
  assert.equal(readVaultName(storage), "review-vault");
});

test("creates a versioned Clipboard Obsidian URI for the selected Vault", () => {
  assert.equal(
    createObsidianUri({ vaultName: "mobile review", version: "0.1.0" }),
    "obsidian://new?vault=mobile%20review&file=Fancy%20Kit%20Harness%200.1.0%20Screwdriver.md&clipboard&overwrite",
  );
  assert.throws(
    () => createObsidianUri({ vaultName: "unsafe\nvault", version: "0.1.0" }),
    /valid Vault name/,
  );
});

test("downloads, hashes, and validates the exact Harness document", async () => {
  const checksum = createHash("sha256").update(harnessDocument).digest("hex");
  const content = await loadVerifiedBundle({
    url: new URL("https://example.invalid/bundle.md"),
    checksum,
    cryptoImplementation: webcrypto,
    fetchImplementation: async () => ({
      ok: true,
      async text() {
        return harnessDocument;
      },
    }),
  });
  assert.equal(content, harnessDocument);
});

test("rejects changed content and unexpected restore paths", async () => {
  const checksum = createHash("sha256").update(harnessDocument).digest("hex");
  await assert.rejects(
    loadVerifiedBundle({
      url: new URL("https://example.invalid/bundle.md"),
      checksum,
      cryptoImplementation: webcrypto,
      fetchImplementation: async () => ({
        ok: true,
        text: async () => `${harnessDocument}changed`,
      }),
    }),
    /checksum does not match/,
  );
  assert.throws(
    () =>
      assertHarnessDocument(
        harnessDocument.replace(
          ".obsidian/plugins/fancy-kit-harness/main.js",
          ".obsidian/community-plugins.json",
        ),
    ),
    /unexpected restore path/,
  );
  assert.throws(
    () =>
      assertHarnessDocument(
        `${harnessDocument}\n\`\`\`screwdriver:.obsidian/plugins/other/main.js:base64:0\nYnlwYXNz\n\`\`\`\n`,
      ),
    /unexpected restore path/,
  );
});
