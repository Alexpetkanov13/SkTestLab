import { defineConfig } from "@vscode/test-cli";
import path from "node:path";
if (!process.env.SKTESTLAB_PROJECT_WORKSPACE)
  throw new Error("Use npm run test:project -- <folder>");
export default defineConfig({
  files: "out/integration/project.smoke.js",
  workspaceFolder: process.env.SKTESTLAB_PROJECT_WORKSPACE,
  launchArgs: [
    "--disable-workspace-trust",
    "--disable-gpu",
    "--no-sandbox",
    "--use-inmemory-secretstorage",
    "--user-data-dir=" +
      path.join(
        path.dirname(process.env.SKTESTLAB_PROJECT_WORKSPACE),
        "profile",
      ),
  ],
  env: {
    SKTESTLAB_PROJECT_ROOT: process.env.SKTESTLAB_PROJECT_ROOT,
    SKTESTLAB_PROJECT_REPORT: process.env.SKTESTLAB_PROJECT_REPORT,
    SKTESTLAB_RUNTIME_CONFIG: process.env.SKTESTLAB_RUNTIME_CONFIG,
  },
});
