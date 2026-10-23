import { mkdtemp, mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import { spawn } from "node:child_process";

const restricted = process.argv.includes("--restricted");
const version =
  process.env.SKTESTLAB_VSCODE_VERSION ?? (restricted ? "stable" : "1.96.0");
await mkdir(".vscode-test", { recursive: true });
const root = await mkdtemp(path.resolve(".vscode-test/editor-check-"));
const workspace = path.join(root, "workspace");
const user = path.join(root, "user-data");
await mkdir(workspace);
await mkdir(path.join(user, "User"), { recursive: true });
for (const name of ["sample.sk", "sample.sktest.json", "broken.sk"])
  await copyFile(
    path.join("test/fixtures/workspace", name),
    path.join(workspace, name),
  );
if (restricted) {
  await writeFile(
    path.join(workspace, "runtime.sktest.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "restricted-runtime",
      name: "Runtime must be blocked",
      mode: "runtime",
      targets: ["sample.sk"],
      assertions: [{ condition: "true is true" }],
      timeoutMs: 5000,
    }),
  );
}
await writeFile(
  path.join(user, "User/settings.json"),
  JSON.stringify({
    "security.workspace.trust.enabled": true,
    "security.workspace.trust.startupPrompt": "never",
    "security.workspace.trust.banner": "never",
    "window.dialogStyle": "custom",
    "update.mode": "none",
  }),
);
const options = {
  version,
  extensionDevelopmentPath: path.resolve(
    process.env.SKTESTLAB_PACKAGED_EXTENSION ?? ".",
  ),
  extensionTestsPath: path.resolve(
    "out/integration/" +
      (restricted ? "restricted.smoke.js" : "minimum.smoke.js"),
  ),
  launchArgs: [
    workspace,
    "--user-data-dir=" + user,
    "--extensions-dir=" + path.join(root, "extensions"),
    "--disable-gpu",
    "--no-sandbox",
    "--skip-welcome",
    "--skip-release-notes",
    ...(restricted ? [] : ["--disable-workspace-trust"]),
  ],
};
if (restricted) {
  // test-electron's runTests always appends --disable-workspace-trust.
  // Launch its official downloaded executable directly for an honest trust test.
  const executable = await downloadAndUnzipVSCode(version);
  await new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        ...options.launchArgs,
        "--extensionDevelopmentPath=" + options.extensionDevelopmentPath,
        "--extensionTestsPath=" + options.extensionTestsPath,
      ],
      { shell: false, windowsHide: true, stdio: "inherit" },
    );
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Restricted editor check timed out"));
    }, 120000);
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      code === 0
        ? resolve()
        : reject(new Error("Restricted editor exited " + code));
    });
  });
} else await runTests(options);
await writeFile(
  path.join(root, "evidence.json"),
  JSON.stringify(
    {
      version,
      restricted,
      passed: true,
      completedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Editor evidence: " + root);
