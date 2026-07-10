import {
  installObsidianAppImage,
  obsidianAppImageArchitecture,
  type ObsidianAppImageArchitecture,
} from "@vrtmrz/obsidian-test-session";

function requestedArchitecture(): ObsidianAppImageArchitecture {
  const requested = process.env.E2E_OBSIDIAN_APPIMAGE_ARCH?.trim();
  if (requested === undefined || requested.length === 0)
    return obsidianAppImageArchitecture();
  if (requested === "arm64" || requested === "x86_64") return requested;
  throw new Error(`Unsupported Obsidian AppImage architecture: ${requested}`);
}

async function main(): Promise<void> {
  const result = await installObsidianAppImage({
    version: process.env.E2E_OBSIDIAN_VERSION,
    architecture: requestedArchitecture(),
    targetDirectory: process.env.E2E_OBSIDIAN_DOWNLOAD_DIR,
    url: process.env.E2E_OBSIDIAN_APPIMAGE_URL,
    forceDownload: process.env.E2E_OBSIDIAN_FORCE_DOWNLOAD === "true",
    extract: process.env.E2E_OBSIDIAN_SKIP_EXTRACT !== "true",
  });
  console.log(
    `Set OBSIDIAN_BINARY=${result.extractedBinary} to use the extracted binary explicitly.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
