import { platform } from "node:process";
import { resolve } from "node:path";
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
