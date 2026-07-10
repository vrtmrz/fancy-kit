import { describe, expect, it } from "vitest";
import {
  obsidianAppImageArchitecture,
  obsidianAppImageUrl,
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

  it("builds the official release asset URL", () => {
    expect(obsidianAppImageUrl("1.12.7", "x86_64")).toBe(
      "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.12.7/Obsidian-1.12.7-x86_64.AppImage",
    );
  });
});
