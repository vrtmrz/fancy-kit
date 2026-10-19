import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@vrtmrz/secret-store": new URL("../secret-store/src/index.ts", import.meta.url).pathname } },
});
