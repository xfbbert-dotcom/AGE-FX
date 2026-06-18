import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["apps/console/**/*.test.ts", "jsdom"],
      ["extension/**/*.test.ts", "jsdom"]
    ],
    include: ["apps/**/*.test.ts", "extension/**/*.test.ts"],
    passWithNoTests: true
  }
});
