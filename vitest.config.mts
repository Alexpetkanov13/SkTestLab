import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts", "test/performance/**/*.test.ts"],
    testTimeout: 15000,
  },
});
