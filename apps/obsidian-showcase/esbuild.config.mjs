import esbuild from "esbuild";
import { resolve } from "node:path";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["apps/obsidian-showcase/main.ts"],
  outfile: "apps/obsidian-showcase/main.js",
  alias: {
    "@vrtmrz/obsidian-plugin-kit": resolve("packages/obsidian-plugin-kit/src/index.ts"),
    "@vrtmrz/ui-interactions": resolve("packages/ui-interactions/src/index.ts"),
  },
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  platform: "browser",
  target: "es2020",
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
