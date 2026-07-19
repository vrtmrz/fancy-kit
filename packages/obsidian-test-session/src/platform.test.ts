import { describe, expect, it } from "vitest";
import {
  obsidianPlatformLaunchArguments,
  obsidianTemporaryRoot,
} from "./platform.js";

describe("macOS Obsidian process isolation", () => {
  it("uses a short root for the Obsidian CLI socket", () => {
    expect(
      obsidianTemporaryRoot("darwin", "/var/folders/long/random/path/to/T"),
    ).toBe("/tmp");
  });

  it("uses the isolated test keychain", () => {
    expect(obsidianPlatformLaunchArguments("darwin")).toContain(
      "--use-mock-keychain",
    );
  });

  it("does not apply macOS launch behaviour to other platforms", () => {
    expect(obsidianTemporaryRoot("linux", "/system/tmp")).toBe("/system/tmp");
    expect(obsidianPlatformLaunchArguments("linux")).toEqual([]);
  });
});
