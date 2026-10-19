import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@vrtmrz/local-storage/web-storage": new URL("../local-storage/src/web-storage.ts", import.meta.url).pathname,
      "@vrtmrz/local-storage": new URL("../local-storage/src/index.ts", import.meta.url).pathname,
      "@vrtmrz/secret-store": new URL("../secret-store/src/index.ts", import.meta.url).pathname,
      obsidian: new URL("./test/obsidian.stub.ts", import.meta.url).pathname,
      "@vrtmrz/ui-interactions/testing": new URL(
        "../ui-interactions/src/testing.ts",
        import.meta.url,
      ).pathname,
      "@vrtmrz/ui-interactions": new URL("../ui-interactions/src/index.ts", import.meta.url).pathname,
    },
  },
});
