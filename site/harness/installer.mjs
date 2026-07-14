import {
  createBundleUrl,
  createObsidianUri,
  createReleaseUrl,
  loadVerifiedBundle,
  parseInstallerRequest,
  readVaultName,
  saveVaultName,
} from "./installer-core.mjs";

const elements = {
  bundleStatus: document.querySelector("#bundle-status"),
  dedicatedVault: document.querySelector("#dedicated-vault"),
  downloadLink: document.querySelector("#download-link"),
  install: document.querySelector("#install"),
  message: document.querySelector("#message"),
  releaseLink: document.querySelector("#release-link"),
  retry: document.querySelector("#retry"),
  vaultName: document.querySelector("#vault-name"),
  version: document.querySelector("#version"),
};

let request;
let bundle;
let bundleUrl;
let storage;

function setMessage(message = "") {
  elements.message.textContent = message;
}

function refreshInstallState() {
  elements.install.disabled = !(
    bundle &&
    elements.dedicatedVault.checked &&
    elements.vaultName.value.trim()
  );
}

async function loadBundle() {
  bundle = undefined;
  elements.bundleStatus.textContent = "Downloading and verifying…";
  elements.retry.hidden = true;
  setMessage();
  refreshInstallState();
  try {
    bundle = await loadVerifiedBundle({
      url: bundleUrl,
      checksum: request.checksum,
    });
    elements.bundleStatus.textContent = "Verified by SHA-256";
  } catch (error) {
    elements.bundleStatus.textContent = "Not ready";
    elements.retry.hidden = false;
    setMessage(error instanceof Error ? error.message : String(error));
  }
  refreshInstallState();
}

function initialise() {
  if (globalThis.top !== globalThis.self) {
    elements.bundleStatus.textContent = "Open this page directly";
    setMessage("The Harness installer cannot run inside another page.");
    return;
  }
  try {
    storage = globalThis.localStorage;
  } catch {
    storage = undefined;
  }
  elements.vaultName.value = readVaultName(storage);
  try {
    request = parseInstallerRequest(globalThis.location.search);
    bundleUrl = createBundleUrl(request, new URL("./", import.meta.url));
    elements.version.textContent = request.version;
    elements.releaseLink.href = createReleaseUrl(request).href;
    elements.downloadLink.href = bundleUrl.href;
  } catch (error) {
    elements.bundleStatus.textContent = "Invalid release link";
    setMessage(error instanceof Error ? error.message : String(error));
    return;
  }

  elements.vaultName.addEventListener("input", refreshInstallState);
  elements.dedicatedVault.addEventListener("change", refreshInstallState);
  elements.retry.addEventListener("click", loadBundle);
  elements.install.addEventListener("click", async () => {
    elements.install.disabled = true;
    setMessage();
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable. Download the document instead.");
      }
      const vaultName = saveVaultName(
        storage,
        elements.vaultName.value,
      );
      await navigator.clipboard.writeText(bundle);
      elements.bundleStatus.textContent = "Verified and copied";
      globalThis.location.assign(
        createObsidianUri({ vaultName, version: request.version }),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      refreshInstallState();
    }
  });

  loadBundle();
}

initialise();
