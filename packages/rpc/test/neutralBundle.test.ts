import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it, vi } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const neutralEntryPath = resolve(packageRoot, "src/index.ts");

describe("Neutral entry import and bundle boundaries", () => {
  it("bundles without browser globals, Node built-ins, Obsidian, PouchDB, Trystero, or Commonlib", async () => {
    const result = await build({
      absWorkingDir: packageRoot,
      entryPoints: [neutralEntryPath],
      bundle: true,
      format: "esm",
      metafile: true,
      platform: "neutral",
      target: "es2022",
      write: false,
    });

    expect(result.outputFiles).toHaveLength(1);
    const outputFile = result.outputFiles[0]!;
    const bundledCode = outputFile.text;
    const outputMeta = Object.values(result.metafile.outputs)[0]!;

    expect(outputMeta.imports).toEqual([]);
    const loadedInputs = Object.keys(result.metafile.inputs).map((file) =>
      file.replaceAll("\\", "/"),
    );
    expect(loadedInputs.every((file) => file.startsWith("src/"))).toBe(true);
    expect(loadedInputs).not.toContain("src/worker.ts");

    const forbiddenPatterns = [
      /\bnode:/,
      /\bobsidian\b/i,
      /\bpouchdb\b/i,
      /\btrystero\b/i,
      /\blivesync-commonlib\b/i,
      /\bMessageChannel\b/,
      /\bBroadcastChannel\b/,
      /\bSharedWorker\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\bsetInterval\b/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(bundledCode).not.toMatch(pattern);
    }
  });

  it("performs no connection setup or timer scheduling upon import", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    try {
      const rpc = await import("../src/index.js");
      expect(typeof rpc.defineContract).toBe("function");
      expect(typeof rpc.withTransfer).toBe("function");
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      setIntervalSpy.mockRestore();
    }
  });
});
