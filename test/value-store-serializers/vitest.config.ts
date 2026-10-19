import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@vrtmrz/value-store": new URL("../../packages/value-store/src/index.ts", import.meta.url).pathname,
      "@vrtmrz/secret-store": new URL("../../packages/secret-store/src/index.ts", import.meta.url).pathname,
      "octagonal-wheels/encryption/hkdf": new URL("../../packages/octagonal-wheels/src/encryption/hkdf.ts", import.meta.url).pathname,
    },
  },
  test: { include: ["test/value-store-serializers/*.test.ts"], maxWorkers: 1 },
});
