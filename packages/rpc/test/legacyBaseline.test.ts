import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { RpcRoom } from "./fixtures/commonlib-0.5.0/reference.mjs";
import { legacyContractSuite } from "./compatibility/legacyContractSuite.js";

legacyContractSuite(
  "Pinned legacy ↔ legacy (harness calibration only)",
  (options) => new RpcRoom(options),
  (options) => new RpcRoom(options),
);

it("uses the recorded reference bundle without silently modifying its behaviour", () => {
  const root = new URL("./fixtures/commonlib-0.5.0/", import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL("manifest.json", root), "utf8"),
  ) as { revision: string; outputHashes: Record<string, string> };
  expect(manifest.revision).toBe("52f65bfa6b355fc504ba3ff1bc46b0d775add490");
  for (const [file, hash] of Object.entries(manifest.outputHashes)) {
    expect(
      createHash("sha256")
        .update(readFileSync(new URL(file, root)))
        .digest("hex"),
    ).toBe(hash);
  }
});
