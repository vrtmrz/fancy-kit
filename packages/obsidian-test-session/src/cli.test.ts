import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { platform } from "node:process";
import { describe, expect, it } from "vitest";
import { openVaultWithObsidianCli } from "./cli.js";

describe("openVaultWithObsidianCli", () => {
  it.runIf(platform !== "win32")(
    "waits for the isolated CLI socket before invoking the CLI",
    async () => {
      const homePath = await mkdtemp(join(tmpdir(), "obsidian-cli-unit-"));
      try {
        await expect(
          openVaultWithObsidianCli(process.execPath, homePath, {
            HOME: homePath,
            E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS: "10",
          }),
        ).rejects.toThrowError(
          `Timed out waiting for Obsidian CLI socket: ${join(homePath, ".obsidian-cli.sock")}`,
        );
      } finally {
        await rm(homePath, { recursive: true, force: true });
      }
    },
  );
});
