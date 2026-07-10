import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Options for creating an isolated temporary Obsidian vault. */
export interface CreateTemporaryVaultOptions {
  /** Temporary-directory prefix. Defaults to `obsidian-e2e-`. */
  prefix?: string;
  /** Plug-in identifiers enabled in `community-plugins.json`. */
  pluginIds?: readonly string[];
  /** Vault registry identifier prefix. Defaults to the temporary-directory prefix. */
  idPrefix?: string;
}

/** An isolated vault and Obsidian application-state directory set. */
export interface TemporaryVault {
  /** Filesystem path of the temporary vault. */
  path: string;
  /** Filesystem path containing isolated application state. */
  statePath: string;
  /** Vault directory name. */
  name: string;
  /** Identifier written into the Obsidian vault registry. */
  id: string;
  /** Isolated `HOME` directory. */
  homePath: string;
  /** Isolated `XDG_CONFIG_HOME` directory. */
  xdgConfigPath: string;
  /** Isolated `XDG_CACHE_HOME` directory. */
  xdgCachePath: string;
  /** Isolated `XDG_DATA_HOME` directory. */
  xdgDataPath: string;
  /** Isolated Electron user-data directory. */
  userDataPath: string;
  /** Stable substring suitable for finding stale processes using this vault family. */
  processMarker: string;
  /** Removes the vault and isolated application state unless preservation is enabled. */
  dispose: () => Promise<void>;
}

/**
 * Creates an isolated temporary vault and Obsidian profile.
 *
 * @param options - Vault naming and initial plug-in options.
 * @returns The temporary vault and its disposal operation.
 */
export async function createTemporaryVault(
  options: CreateTemporaryVaultOptions = {},
): Promise<TemporaryVault> {
  const prefix = options.prefix ?? "obsidian-e2e-";
  const processMarker = `${prefix}state-`;
  const vaultPath = await mkdtemp(join(tmpdir(), prefix));
  const statePath = await mkdtemp(join(tmpdir(), processMarker));
  const name = vaultPath.split(/[\\/]/u).pop() ?? "obsidian-e2e";
  const safeIdPrefix = (options.idPrefix ?? prefix)
    .replace(/[^A-Za-z0-9_-]/gu, "-")
    .replace(/-+$/u, "");
  const id = `${safeIdPrefix || "obsidian-e2e"}-${process.pid}-${Date.now()}`;
  await mkdir(join(vaultPath, ".obsidian"), { recursive: true });

  const homePath = join(statePath, "home");
  const xdgConfigPath = join(statePath, "xdg-config");
  const xdgCachePath = join(statePath, "xdg-cache");
  const xdgDataPath = join(statePath, "xdg-data");
  const userDataPath = join(statePath, "user-data");
  await Promise.all([
    mkdir(homePath, { recursive: true }),
    mkdir(xdgConfigPath, { recursive: true }),
    mkdir(xdgCachePath, { recursive: true }),
    mkdir(xdgDataPath, { recursive: true }),
    mkdir(userDataPath, { recursive: true }),
  ]);
  await writeFile(
    join(vaultPath, ".obsidian", "app.json"),
    JSON.stringify({ legacyEditor: false, safeMode: false }, null, 4),
  );
  await writeFile(
    join(vaultPath, ".obsidian", "community-plugins.json"),
    JSON.stringify(options.pluginIds ?? [], null, 4),
  );
  await writeObsidianVaultRegistry(
    id,
    vaultPath,
    name,
    homePath,
    xdgConfigPath,
    userDataPath,
  );

  return {
    path: vaultPath,
    statePath,
    name,
    id,
    homePath,
    xdgConfigPath,
    xdgCachePath,
    xdgDataPath,
    userDataPath,
    processMarker,
    dispose: async () => {
      if (process.env.E2E_OBSIDIAN_KEEP_VAULT === "true") {
        console.log(`Keeping temporary vault: ${vaultPath}`);
        console.log(`Keeping temporary Obsidian state: ${statePath}`);
        return;
      }
      await Promise.all([
        rm(vaultPath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 200,
        }),
        rm(statePath, {
          recursive: true,
          force: true,
          maxRetries: 5,
          retryDelay: 200,
        }),
      ]);
    },
  };
}

async function writeObsidianVaultRegistry(
  vaultId: string,
  vaultPath: string,
  vaultName: string,
  homePath: string,
  xdgConfigPath: string,
  userDataPath: string,
): Promise<void> {
  const vaultRecord = {
    path: vaultPath,
    ts: Date.now(),
    open: true,
    name: vaultName,
  };
  const registryText = JSON.stringify(
    { cli: true, vaults: { [vaultId]: vaultRecord } },
    null,
    4,
  );
  for (const configRoot of [join(homePath, ".config"), xdgConfigPath]) {
    const obsidianConfigDir = join(configRoot, "obsidian");
    await mkdir(obsidianConfigDir, { recursive: true });
    await writeFile(join(obsidianConfigDir, "obsidian.json"), registryText);
  }
  await writeFile(join(userDataPath, "obsidian.json"), registryText);
  await writeFile(
    join(userDataPath, `${vaultId}.json`),
    JSON.stringify(vaultRecord, null, 4),
  );
}
