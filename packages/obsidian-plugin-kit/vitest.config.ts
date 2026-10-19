import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@vrtmrz/value-store/web-storage": new URL("../value-store/src/web-storage.ts", import.meta.url).pathname,
      "@vrtmrz/value-store": new URL("../value-store/src/index.ts", import.meta.url).pathname,
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
