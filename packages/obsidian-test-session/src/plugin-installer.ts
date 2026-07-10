import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Options describing one built Obsidian plug-in. */
export interface PluginInstallOptions {
  /** Plug-in identifier used for its vault directory and manifest registration. */
  pluginId: string;
  /** Directory containing `main.js`, `manifest.json`, and optional `styles.css`. */
  artifactRoot: string;
}

/** Result of installing built plug-in artefacts into a vault. */
export interface PluginInstallResult {
  /** Destination plug-in directory. */
  pluginDir: string;
  /** Artefact names copied into the destination. */
  copied: string[];
}

/**
 * Installs built plug-in artefacts into an Obsidian vault.
 *
 * @param vaultPath - Filesystem path of the target vault.
 * @param options - Plug-in identifier and artefact directory.
 * @returns The destination and copied artefact names.
 */
export async function installBuiltPlugin(
  vaultPath: string,
  options: PluginInstallOptions,
): Promise<PluginInstallResult> {
  const pluginDir = join(vaultPath, ".obsidian", "plugins", options.pluginId);
  const copied: string[] = [];
  await mkdir(pluginDir, { recursive: true });

  for (const artifact of ["main.js", "manifest.json"]) {
    const source = resolve(options.artifactRoot, artifact);
    if (!existsSync(source))
      throw new Error(`Required plug-in artefact is missing: ${source}`);
    await copyFile(source, join(pluginDir, artifact));
    copied.push(artifact);
  }

  const styles = resolve(options.artifactRoot, "styles.css");
  if (existsSync(styles)) {
    await copyFile(styles, join(pluginDir, "styles.css"));
    copied.push("styles.css");
  }

  await writeFile(
    join(vaultPath, ".obsidian", "community-plugins.json"),
    JSON.stringify([options.pluginId], null, 2),
  );
  return { pluginDir, copied };
}
