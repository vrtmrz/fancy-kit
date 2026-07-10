import { existsSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface PluginInstallOptions {
  pluginId: string;
  artifactRoot: string;
}

export interface PluginInstallResult {
  pluginDir: string;
  copied: string[];
}

export async function installBuiltPlugin(
  vaultPath: string,
  options: PluginInstallOptions,
): Promise<PluginInstallResult> {
  const pluginDir = join(vaultPath, ".obsidian", "plugins", options.pluginId);
  const copied: string[] = [];
  await mkdir(pluginDir, { recursive: true });

  for (const artifact of ["main.js", "manifest.json"]) {
    const source = resolve(options.artifactRoot, artifact);
    if (!existsSync(source)) throw new Error(`Required plugin artefact is missing: ${source}`);
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
