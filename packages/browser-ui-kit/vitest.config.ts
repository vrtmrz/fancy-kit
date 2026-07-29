import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@vrtmrz/ui-interactions": new URL("../ui-interactions/src/index.ts", import.meta.url).pathname,
    },
  },
});
