import { win32 } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => new Set<string>());

vi.mock("node:process", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:process")>()),
  platform: "win32",
}));

vi.mock("node:path", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:path")>();
  return {
    ...actual,
    join: actual.win32.join,
    resolve: actual.win32.resolve,
    delimiter: actual.win32.delimiter,
  };
});

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  existsSync: (path: string) => files.has(path.toLowerCase()),
}));

import { discoverObsidianBinary, discoverObsidianCli } from "./environment.js";

const nativeDirectory = "C:\\Program Files\\Obsidian";
const env = {
  LOCALAPPDATA: "C:\\Users\\test\\AppData\\Local",
  ProgramFiles: "C:\\Program Files (x86)",
  "ProgramFiles(x86)": "C:\\Program Files (x86)",
  ProgramW6432: "C:\\Program Files",
  Path: "",
};

beforeEach(() => files.clear());

function addFile(directory: string, filename: string): string {
  const path = win32.join(directory, filename);
  files.add(path.toLowerCase());
  return path;
}

describe("Windows executable discovery", () => {
  it("finds native all-user executables from a 64-bit environment", () => {
    const binary = addFile(nativeDirectory, "Obsidian.exe");
    const cli = addFile(nativeDirectory, "obsidian-cli.exe");
    const nativeEnv = { ...env, ProgramFiles: env.ProgramW6432 };

    expect(discoverObsidianBinary(nativeEnv).binary).toBe(binary);
    expect(discoverObsidianCli(nativeEnv).binary).toBe(cli);
  });

  it.each([
    ["Obsidian.exe", discoverObsidianBinary],
    ["Obsidian.com", discoverObsidianCli],
    ["obsidian-cli.exe", discoverObsidianCli],
  ] as const)(
    "finds native all-user %s from a WOW64 environment without PATH registration",
    (filename, discover) => {
      const path = addFile(nativeDirectory, filename);

      expect(discover(env).binary).toBe(path);
    },
  );

  it("prefers per-user executables over native all-user executables", () => {
    const perUserDirectory = win32.join(env.LOCALAPPDATA, "Programs", "Obsidian");
    const binary = addFile(perUserDirectory, "Obsidian.exe");
    const cli = addFile(perUserDirectory, "Obsidian.com");
    addFile(nativeDirectory, "Obsidian.exe");
    addFile(nativeDirectory, "Obsidian.com");

    expect(discoverObsidianBinary(env).binary).toBe(binary);
    expect(discoverObsidianCli(env).binary).toBe(cli);
  });
});
