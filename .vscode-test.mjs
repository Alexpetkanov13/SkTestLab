import { defineConfig } from "@vscode/test-cli";
export default defineConfig([
  {
    label: "trusted",
    extensionDevelopmentPath: process.env.SKTESTLAB_PACKAGED_EXTENSION,
    files: "out/integration/**/*.test.js",
    workspaceFolder: "test/fixtures/workspace",
    launchArgs: ["--disable-workspace-trust", "--disable-gpu", "--no-sandbox"],
  },
]);
