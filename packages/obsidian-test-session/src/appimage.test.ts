import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  installObsidianAppImage,
  obsidianAppImageArchitecture,
  obsidianAppImageInstallDirectory,
  obsidianAppImageUrl,
  resolveObsidianAppImageRelease,
} from "./appimage.js";

describe("Obsidian AppImage release selection", () => {
  it.each([
    ["x64", "x86_64"],
    ["arm64", "arm64"],
  ] as const)(
    "maps Node architecture %s to %s",
    (nodeArchitecture, appImageArchitecture) => {
      expect(obsidianAppImageArchitecture(nodeArchitecture)).toBe(
        appImageArchitecture,
      );
    },
  );

  it("rejects architectures without an official AppImage mapping", () => {
    expect(() => obsidianAppImageArchitecture("ia32")).toThrowError(
      "Unsupported architecture",
    );
  });

  it("builds the official x86_64 release asset URL without an architecture suffix", () => {
    expect(obsidianAppImageUrl("1.12.7", "x86_64")).toBe(
      "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.12.7/Obsidian-1.12.7.AppImage",
    );
  });

  it("builds the official arm64 release asset URL with an architecture suffix", () => {
    expect(obsidianAppImageUrl("1.13.6", "arm64")).toBe(
      "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.6/Obsidian-1.13.6-arm64.AppImage",
    );
  });

  it("rejects an unvalidated release unless the caller explicitly allows it", async () => {
    const targetDirectory = await mkdtemp(
      join(tmpdir(), "obsidian-appimage-unknown-unit-"),
    );
    const assetName = "Obsidian-9.99.99-arm64.AppImage";
    try {
      await mkdir(targetDirectory, { recursive: true });
      await writeFile(join(targetDirectory, assetName), "fixture");

      await expect(
        installObsidianAppImage({
          version: "9.99.99",
          architecture: "arm64",
          targetDirectory,
          url: `https://example.invalid/${assetName}`,
          extract: false,
        }),
      ).rejects.toThrowError("Unvalidated Obsidian AppImage release");
    } finally {
      await rm(targetDirectory, { recursive: true, force: true });
    }
  });

  it("resolves reviewed releases from the immutable catalogue", async () => {
    await expect(
      resolveObsidianAppImageRelease({
        version: "1.13.6",
        architecture: "x86_64",
      }),
    ).resolves.toMatchObject({
      version: "1.13.6",
      architecture: "x86_64",
      support: "validated",
      source: "validated-catalogue",
      assetName: "Obsidian-1.13.6.AppImage",
      expectedSha256:
        "7f1d5829263c93ca9d166c2be7aba941ac52f50861a46adda72105411a7b541e",
    });
  });

  it("resolves an explicitly permitted unverified release through official metadata", async () => {
    const fetchGitHubRelease = vi.fn(async () => ({
      tag_name: "v1.13.7",
      assets: [
        {
          name: "Obsidian-1.13.7.AppImage",
          browser_download_url:
            "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.7/Obsidian-1.13.7.AppImage",
          digest:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        {
          name: "Obsidian-1.13.7-arm64.AppImage",
          browser_download_url:
            "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.7/Obsidian-1.13.7-arm64.AppImage",
          digest:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
    }));

    await expect(
      resolveObsidianAppImageRelease({
        version: "1.13.7",
        architecture: "arm64",
        allowUnverifiedVersion: true,
        fetchGitHubRelease,
      }),
    ).resolves.toEqual({
      version: "1.13.7",
      architecture: "arm64",
      support: "unverified",
      source: "github-release",
      tag: "v1.13.7",
      assetName: "Obsidian-1.13.7-arm64.AppImage",
      url: "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.13.7/Obsidian-1.13.7-arm64.AppImage",
      expectedSha256:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    expect(fetchGitHubRelease).toHaveBeenCalledWith("1.13.7");
  });

  it.each(["latest", "v1.13.6", "1.13", "unknown", "1.13.6-beta.1"])(
    "rejects the non-exact target %s",
    async (version) => {
      await expect(
        resolveObsidianAppImageRelease({
          version,
          architecture: "arm64",
          allowUnverifiedVersion: true,
        }),
      ).rejects.toThrowError("exact stable version");
    },
  );

  it("keeps unverified downloads and metadata inside a versioned architecture directory", async () => {
    const targetDirectory = await mkdtemp(
      join(tmpdir(), "obsidian-appimage-versioned-unit-"),
    );
    const version = "9.99.98";
    const architecture = "arm64";
    const assetName = `Obsidian-${version}-arm64.AppImage`;
    const installDirectory = obsidianAppImageInstallDirectory(
      targetDirectory,
      version,
      architecture,
    );
    try {
      await mkdir(installDirectory, { recursive: true });
      await writeFile(join(installDirectory, assetName), "fixture");
      await writeFile(
        join(installDirectory, "release.json"),
        JSON.stringify({
          schemaVersion: 1,
          version,
          architecture,
          support: "unverified",
          source: "url-override",
          tag: `v${version}`,
          assetName,
          url: `https://example.invalid/${assetName}`,
          sha256: createHash("sha256").update("fixture").digest("hex"),
          preparedAt: "2026-08-11T00:00:00.000Z",
          extracted: false,
        }),
      );

      const result = await installObsidianAppImage({
        version,
        architecture,
        targetDirectory,
        url: `https://example.invalid/${assetName}`,
        allowUnverifiedVersion: true,
        extract: false,
        log: vi.fn(),
      });

      expect(result.installDirectory).toBe(installDirectory);
      expect(result.appImagePath).toBe(join(installDirectory, assetName));
      expect(result.support).toBe("unverified");
      expect(
        JSON.parse(await readFile(result.metadataPath, "utf8")),
      ).toMatchObject({
        version,
        architecture,
        support: "unverified",
        assetName,
        extracted: false,
      });
      expect(
        JSON.parse(await readFile(result.metadataPath, "utf8")).preparedAt,
      ).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    } finally {
      await rm(targetDirectory, { recursive: true, force: true });
    }
  });
});
