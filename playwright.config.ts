import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src", // This tells Playwright to look for tests in the src directory
  testMatch: "**/*.spec.ts", // This pattern will match your test.spec.ts file
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // You can add more browser configurations here
  },
  reporter: "html",
});
