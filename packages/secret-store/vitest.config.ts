import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@vrtmrz/value-store": new URL("../value-store/src/index.ts", import.meta.url).pathname } },
});
