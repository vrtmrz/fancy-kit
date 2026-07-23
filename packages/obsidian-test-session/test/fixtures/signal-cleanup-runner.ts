import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createTemporaryVault, launchObsidian } from "../../src/index.ts";

const temporaryRoot = process.env.SIGNAL_CLEANUP_TEMPORARY_ROOT;
const readyPath = process.env.SIGNAL_CLEANUP_READY_PATH;
if (!temporaryRoot || !readyPath) {
  throw new Error(
    "The signal cleanup fixture requires its temporary root and ready path",
  );
}

const detachedProcessPath = fileURLToPath(
  new URL("./detached-process.mjs", import.meta.url),
);
const vault = await createTemporaryVault({
  prefix: "obsidian-signal-cleanup-",
  temporaryRoot,
});
const app = await launchObsidian({
  binary: process.execPath,
  vaultPath: vault.path,
  homePath: vault.homePath,
  xdgConfigPath: vault.xdgConfigPath,
  xdgCachePath: vault.xdgCachePath,
  xdgDataPath: vault.xdgDataPath,
  userDataPath: vault.userDataPath,
  startupGraceMs: 50,
  staleProcessPattern: vault.processMarker,
  env: {
    ...process.env,
    E2E_OBSIDIAN_ARGS: detachedProcessPath,
    E2E_OBSIDIAN_USE_XVFB: "false",
  },
});

await writeFile(
  readyPath,
  JSON.stringify({
    runnerPid: process.pid,
    processPid: app.process.pid,
    vaultPath: vault.path,
    statePath: vault.statePath,
  }),
);

await new Promise<never>(() => undefined);
