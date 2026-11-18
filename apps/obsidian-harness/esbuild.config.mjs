import esbuild from "esbuild";
import { resolve } from "node:path";

const production = process.argv[2] === "production";
const target = "es2020";
const workerAliases = {
  "@vrtmrz/rpc/worker": resolve("packages/rpc/src/worker.ts"),
  "@vrtmrz/rpc": resolve("packages/rpc/src/index.ts"),
};

const embeddedWorker = {
  name: "harness-worker-rpc",
  setup(build) {
    build.onResolve({ filter: /^harness:worker-rpc$/ }, ({ path }) => ({
      path,
      namespace: "harness-worker",
    }));
    build.onLoad({ filter: /.*/, namespace: "harness-worker" }, async () => {
      const result = await esbuild.build({
        entryPoints: ["apps/obsidian-harness/worker-rpc/worker.ts"],
        alias: workerAliases,
        bundle: true,
        format: "iife",
        platform: "browser",
        target,
        minify: production,
        metafile: true,
        write: false,
      });
      return {
        contents: result.outputFiles[0].text,
        loader: "text",
        watchFiles: Object.keys(result.metafile.inputs).map((path) => resolve(path)),
      };
    });
  },
};

const context = await esbuild.context({
  entryPoints: ["apps/obsidian-harness/main.ts"],
  outfile: "apps/obsidian-harness/main.js",
  plugins: [embeddedWorker],
  alias: {
    ...workerAliases,
    "@vrtmrz/obsidian-plugin-kit/vault": resolve(
      "packages/obsidian-plugin-kit/src/vault.ts",
    ),
    "@vrtmrz/obsidian-plugin-kit": resolve("packages/obsidian-plugin-kit/src/index.ts"),
    "@vrtmrz/ui-interactions": resolve("packages/ui-interactions/src/index.ts"),
    "octagonal-wheels/browser/wakeLock": resolve(
      "packages/octagonal-wheels/src/browser/wakeLock.ts",
    ),
  },
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  platform: "browser",
  target,
  sourcemap: production ? false : "inline",
  minify: production,
  treeShaking: true,
  logLevel: "info",
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
