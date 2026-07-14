export const DEFAULT_VAULT_NAME = "fancy-kit-harness";
export const VAULT_STORAGE_KEY = "fancy-kit-harness.vault-name";

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;
const CHECKSUM_PATTERN = /^[0-9a-f]{64}$/i;
const PLUGIN_ROOT = ".obsidian/plugins/fancy-kit-harness";
const EXPECTED_PATHS = new Set(
  ["main.js", "manifest.json", "styles.css"].map(
    (file) => `${PLUGIN_ROOT}/${file}`,
  ),
);
const EXPECTED_DIRECTIVES = new Set(
  [...EXPECTED_PATHS].map((path) => `${path}:plain:0`),
);

export function parseInstallerRequest(search) {
  const parameters = new URLSearchParams(search);
  const version = parameters.get("version")?.trim() ?? "";
  const checksum = parameters.get("sha256")?.trim().toLowerCase() ?? "";
  if (!VERSION_PATTERN.test(version)) {
    throw new Error("The installer link does not contain a valid Harness version.");
  }
  if (!CHECKSUM_PATTERN.test(checksum)) {
    throw new Error("The installer link does not contain a valid bundle checksum.");
  }
  return {
    version,
    checksum,
    tag: `harness-${version}`,
    assetName: `fancy-kit-harness-${version}-screwdriver.md`,
  };
}

export function createBundleUrl(request, installerBaseUrl) {
  return new URL(
    `releases/${encodeURIComponent(request.tag)}/${encodeURIComponent(request.assetName)}`,
    installerBaseUrl,
  );
}

export function createReleaseUrl(request) {
  return new URL(
    `https://github.com/vrtmrz/fancy-kit/releases/tag/${encodeURIComponent(request.tag)}`,
  );
}

export function readVaultName(storage) {
  try {
    return storage?.getItem(VAULT_STORAGE_KEY)?.trim() || DEFAULT_VAULT_NAME;
  } catch {
    return DEFAULT_VAULT_NAME;
  }
}

function normaliseVaultName(vaultName) {
  const value = vaultName.trim();
  if (!value) throw new Error("Enter the dedicated Vault name or ID.");
  if (value.length > 256 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new Error("Enter a valid Vault name or ID without control characters.");
  }
  return value;
}

export function saveVaultName(storage, vaultName) {
  const value = normaliseVaultName(vaultName);
  try {
    storage?.setItem(VAULT_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
  return value;
}

export function createObsidianUri({ vaultName, version }) {
  const vault = normaliseVaultName(vaultName);
  if (!VERSION_PATTERN.test(version)) throw new Error("Invalid Harness version.");
  const file = `Fancy Kit Harness ${version} Screwdriver.md`;
  return `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}&clipboard&overwrite`;
}

export async function sha256Hex(content, cryptoImplementation = globalThis.crypto) {
  if (!cryptoImplementation?.subtle) {
    throw new Error("This browser cannot verify the Harness bundle.");
  }
  const digest = await cryptoImplementation.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function assertHarnessDocument(content) {
  if (!content.startsWith("---\n") || !content.includes("\nadjustObsidianDir: true\n")) {
    throw new Error("The downloaded file is not a Fancy Kit Harness Screwdriver document.");
  }
  const directives = [...content.matchAll(/^```screwdriver:([^\n]+)$/gm)].map(
    (match) => match[1],
  );
  if (
    directives.length !== EXPECTED_DIRECTIVES.size ||
    new Set(directives).size !== EXPECTED_DIRECTIVES.size ||
    directives.some((directive) => !EXPECTED_DIRECTIVES.has(directive))
  ) {
    throw new Error("The Harness document contains an unexpected restore path.");
  }
  if (
    content.includes(`${PLUGIN_ROOT}/data.json`) ||
    content.includes(".obsidian/community-plugins.json")
  ) {
    throw new Error("The Harness document contains an unsafe configuration path.");
  }
}

export async function loadVerifiedBundle({
  url,
  checksum,
  fetchImplementation = globalThis.fetch,
  cryptoImplementation = globalThis.crypto,
}) {
  if (typeof fetchImplementation !== "function") {
    throw new Error("This browser cannot download the Harness bundle.");
  }
  const response = await fetchImplementation(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) {
    throw new Error(
      "The reviewed bundle is not available from the installer site yet. Try again after the Pages deployment finishes.",
    );
  }
  const content = await response.text();
  const actualChecksum = await sha256Hex(content, cryptoImplementation);
  if (actualChecksum !== checksum.toLowerCase()) {
    throw new Error("The Harness bundle checksum does not match the release link.");
  }
  assertHarnessDocument(content);
  return content;
}
