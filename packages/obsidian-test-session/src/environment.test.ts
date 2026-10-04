import { platform } from "node:process";
import { join, resolve } from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_VALIDATED_OBSIDIAN_VERSION,
  obsidianAppImageArchitecture,
} from "./appimage.js";
import { discoverObsidianBinary, discoverObsidianCli } from "./environment.js";

describe("Obsidian executable discovery", () => {
  it("prefers an explicit executable override", () => {
    const result = discoverObsidianBinary({ OBSIDIAN_BINARY: process.execPath });

    expect(result.binary).toBe(process.execPath);
    expect(result.source).toBe("environment");
    expect(result.checked).toEqual([process.execPath]);
  });

  it.runIf(platform === "darwin")("checks the supported macOS CLI locations", () => {
    const result = discoverObsidianCli({});

    expect(result.checked).toContain(
      "/Applications/Obsidian.app/Contents/MacOS/obsidian-cli",
    );
    expect(result.checked).toContain("/usr/local/bin/obsidian");
  });

  it.runIf(platform === "win32")(
    "finds the official per-user Windows executable and terminal redirector outside PATH",
    async () => {
      const localAppData = await mkdtemp(join(tmpdir(), "obsidian-discovery-"));
      const installDirectory = join(localAppData, "Programs", "Obsidian");
      await mkdir(installDirectory, { recursive: true });
      await Promise.all([
        writeFile(join(installDirectory, "Obsidian.exe"), "fixture"),
        writeFile(join(installDirectory, "Obsidian.com"), "fixture"),
      ]);
      try {
        const env = { LOCALAPPDATA: localAppData, Path: "" };

        expect(discoverObsidianBinary(env).binary).toBe(
          join(installDirectory, "Obsidian.exe"),
        );
        expect(discoverObsidianCli(env).binary).toBe(
          join(installDirectory, "Obsidian.com"),
        );
      } finally {
        await rm(localAppData, { recursive: true, force: true });
      }
    },
  );

  it.runIf(platform === "win32")(
    "checks every standard Windows location before PATH candidates",
    () => {
      const localAppData = join(tmpdir(), "missing-obsidian-local-app-data");
      const programFiles = "C:\\Missing Program Files";
      const programFilesX86 = "C:\\Missing Program Files (x86)";
      const pathEntry = "C:\\Missing Path Entry";
      const result = discoverObsidianCli({
        LOCALAPPDATA: localAppData,
        ProgramFiles: programFiles,
        "ProgramFiles(x86)": programFilesX86,
        Path: pathEntry,
      });

      expect(result.binary).toBeUndefined();
      expect(result.checked).toEqual(
        [
          join(localAppData, "Programs", "Obsidian"),
          join(programFiles, "Obsidian"),
          join(programFilesX86, "Obsidian"),
          pathEntry,
        ].flatMap((directory) => [
          join(directory, "Obsidian.com"),
          join(directory, "obsidian-cli.exe"),
        ]),
      );
    },
  );

  it.runIf(platform === "linux")(
    "selects the versioned managed AppImage by default",
    () => {
      const result = discoverObsidianBinary({});

      expect(result.checked).toContain(
        resolve(
          `_testdata/obsidian/${DEFAULT_VALIDATED_OBSIDIAN_VERSION}/${obsidianAppImageArchitecture()}/squashfs-root/obsidian`,
        ),
      );
      expect(result.checked).not.toContain("/usr/bin/obsidian");
    },
  );

  it.runIf(platform === "linux")(
    "does not fall back to a different system version when a target is explicit",
    () => {
      const result = discoverObsidianBinary({
        E2E_OBSIDIAN_VERSION: "1.12.7",
        E2E_OBSIDIAN_DOWNLOAD_DIR: "/tmp/missing-obsidian-target",
      });

      expect(result.checked).toEqual([
        `/tmp/missing-obsidian-target/1.12.7/${obsidianAppImageArchitecture()}/squashfs-root/obsidian`,
        `/tmp/missing-obsidian-target/1.12.7/${obsidianAppImageArchitecture()}/squashfs-root/AppRun`,
      ]);
    },
  );

  it.runIf(platform === "linux")(
    "rejects an unvalidated managed target unless the probe is explicit",
    () => {
      expect(() =>
        discoverObsidianBinary({ E2E_OBSIDIAN_VERSION: "1.13.7" }),
      ).toThrowError("Unvalidated Obsidian AppImage release");

      expect(
        discoverObsidianBinary({
          E2E_OBSIDIAN_VERSION: "1.13.7",
          E2E_OBSIDIAN_ALLOW_UNVERIFIED_VERSION: "true",
        }).checked,
      ).toContain(
        resolve(
          `_testdata/obsidian/1.13.7/${obsidianAppImageArchitecture()}/squashfs-root/obsidian`,
        ),
      );
    },
  );
});
