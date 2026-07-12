import { platform } from "node:process";
import { describe, expect, it } from "vitest";
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
});
