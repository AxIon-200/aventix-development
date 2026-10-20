import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
    // Each exact-password scrypt derivation needs about 128 MiB. Bound file
    // concurrency; HTTP race tests explicitly run simultaneous requests.
    maxWorkers: 1,
    testTimeout: 15000,
  },
});
