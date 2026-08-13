import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("generated subpath declarations resolve with Node10 module resolution", async () => {
    const manifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
    const mappings = manifest.typesVersions?.["*"];
    assert.ok(mappings, "The generated manifest must include legacy TypeScript declaration mappings.");
    const exportedSubpaths = Object.keys(manifest.exports)
        .filter((subpath) => subpath !== "." && subpath !== "./package.json")
        .map((subpath) => subpath.slice(2))
        .sort();
    assert.deepEqual(
        Object.keys(mappings).sort(),
        exportedSubpaths,
        "Every public subpath must have a declaration mapping."
    );

    const consumerDirectory = await mkdtemp(resolve(tmpdir(), "octagonal-wheels-node10-"));
    try {
        const packageDirectory = resolve(consumerDirectory, "node_modules", manifest.name);
        await mkdir(dirname(packageDirectory), { recursive: true });
        await symlink(packageRoot, packageDirectory, process.platform === "win32" ? "junction" : "dir");

        const containingFile = resolve(consumerDirectory, "consumer.ts");
        const compilerOptions = {
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Node10,
        };

        for (const [subpath, targets] of Object.entries(mappings) as [string, string[]][]) {
            assert.equal(targets.length, 1, `Expected one declaration target for '${subpath}'.`);
            const resolution = ts.resolveModuleName(
                `${manifest.name}/${subpath}`,
                containingFile,
                compilerOptions,
                ts.sys
            );
            const resolved = resolution.resolvedModule?.resolvedFileName;
            assert.ok(resolved, `Node10 resolution could not resolve '${manifest.name}/${subpath}'.`);
            assert.equal(
                relative(packageRoot, resolved).replaceAll("\\", "/"),
                targets[0],
                `Node10 resolution selected an unexpected declaration for '${manifest.name}/${subpath}'.`
            );
        }
    } finally {
        await rm(consumerDirectory, { recursive: true, force: true });
    }
});
