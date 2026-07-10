import esbuild from "esbuild";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["showcase/main.ts"],
  outfile: "showcase/main.js",
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
