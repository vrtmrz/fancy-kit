import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      obsidian: new URL("./test/obsidian.stub.ts", import.meta.url).pathname,
      "@vrtmrz/ui-interactions/testing": new URL(
        "../ui-interactions/src/testing.ts",
        import.meta.url,
      ).pathname,
      "@vrtmrz/ui-interactions": new URL("../ui-interactions/src/index.ts", import.meta.url).pathname,
    },
  },
});
