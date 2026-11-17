import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { build, version as esbuildVersion } from "esbuild";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/generateLegacyFixture.mjs <commonlib-checkout>",
  );
const revision = "52f65bfa6b355fc504ba3ff1bc46b0d775add490";
const output = fileURLToPath(
  new URL("../test/fixtures/commonlib-0.5.0/", import.meta.url),
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const files = [
  "RpcRoom.ts",
  "RpcSession.ts",
  "types.ts",
  "errors.ts",
  "chunking.ts",
  "RpcRoom/pendingInvocations.ts",
];
const modules = new Map();
const hashes = {};
for (const file of files) {
  const path = `src/rpc/${file}`;
  const contents = execFileSync(
    "git",
    ["-C", source, "show", `${revision}:${path}`],
    { encoding: "utf8" },
  );
  modules.set(path, contents);
  hashes[path] = sha256(contents);
}
const dependency = JSON.parse(
  await readFile(
    resolve(source, "node_modules/octagonal-wheels/package.json"),
    "utf8",
  ),
);
if (dependency.version !== "0.1.56")
  throw new Error("Expected octagonal-wheels 0.1.56");
for (const name of ["context", "concurrency/deferredAction"]) {
  const contents = await readFile(
    resolve(source, `node_modules/octagonal-wheels/dist/${name}.js`),
    "utf8",
  );
  modules.set(`octagonal-wheels/${name}`, contents);
  hashes[`octagonal-wheels/${name}`] = sha256(contents);
}
// The only host adaptation: retain method receiver binding while using Node timers.
modules.set("timer-host", "export const compatGlobal = globalThis;");
modules.set(
  "reference.ts",
  'export { RpcRoom } from "./src/rpc/RpcRoom"; export { RpcError } from "./src/rpc/errors";',
);
const result = await build({
  entryPoints: ["reference.ts"],
  bundle: true,
  write: false,
  outdir: "fixture",
  format: "esm",
  platform: "node",
  target: "es2022",
  plugins: [
    {
      name: "pinned-source",
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          let path = args.path;
          if (path === "@lib/common/coreEnvFunctions") path = "timer-host";
          else if (path.startsWith("."))
            path =
              posix.normalize(posix.join(posix.dirname(args.importer), path)) +
              ".ts";
          if (!modules.has(path))
            throw new Error(`Unrecorded fixture dependency: ${path}`);
          return { path, namespace: "pinned" };
        });
        builder.onLoad({ filter: /.*/, namespace: "pinned" }, (args) => ({
          contents: modules.get(args.path),
          loader: args.path.endsWith(".ts") ? "ts" : "js",
        }));
      },
    },
  ],
});
await mkdir(output, { recursive: true });
const outputs = {};
for (const file of result.outputFiles) {
  const name = file.path.split("/").pop().replace(/\.js$/, ".mjs");
  await writeFile(resolve(output, name), file.contents);
  outputs[name] = sha256(file.contents);
}
const licence = execFileSync("git", [
  "-C",
  source,
  "show",
  `${revision}:LICENSE`,
]);
await writeFile(resolve(output, "LICENSE"), licence);
await writeFile(
  resolve(output, "LICENSE-octagonal-wheels"),
  await readFile(resolve(source, "node_modules/octagonal-wheels/LICENSE")),
);
await writeFile(
  resolve(output, "manifest.json"),
  JSON.stringify(
    {
      revision,
      esbuildVersion,
      dependency: { name: "octagonal-wheels", version: dependency.version },
      sourceHashes: hashes,
      outputHashes: outputs,
      adaptation: "compatGlobal = globalThis; Node test fixture only",
    },
    null,
    2,
  ) + "\n",
);
console.log("Generated pinned legacy fixture and source/output hashes.");
