import { mkdtemp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  downloadAndUnzipVSCode,
  runVSCodeCommand,
  resolveCliPathFromVSCodeExecutablePath,
} from "@vscode/test-electron";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (process.platform !== "win32" || process.arch !== "x64")
  throw new Error(
    "Distribution acceptance currently requires Windows x64 to match the release VSIX target",
  );
const version = packageJson.version;
const bundle = path.resolve(
  process.env.SKTESTLAB_ACCEPT_BUNDLE ??
    `release/${version}/sktestlab-${version}-download.zip`,
);
await mkdir(".vscode-test", { recursive: true });
const root = await mkdtemp(path.resolve(".vscode-test/distribution-"));
async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: false,
      ...options,
    });
    let output = "";
    child.stdout?.on("data", (b) => (output += String(b)));
    child.stderr?.on("data", (b) => (output += String(b)));
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Acceptance subprocess timed out"));
    }, 360000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(output)
        : reject(new Error(output + "\nExit " + code));
    });
  });
}
const extracted = path.join(root, "download");
await run("python", ["scripts/extract-download.py", bundle, extracted]);
const workspace = path.join(extracted, "reward-lab");
const user = path.join(root, "user-data"),
  extensions = path.join(root, "extensions");
await mkdir(path.join(user, "User"), { recursive: true });
const settings = {
  "update.mode": "none",
  "extensions.autoUpdate": false,
  "window.dialogStyle": "custom",
};
if (process.env.SKTESTLAB_ACCEPT_RUNTIME_CONFIG) {
  const config = JSON.parse(
    await readFile(process.env.SKTESTLAB_ACCEPT_RUNTIME_CONFIG, "utf8"),
  );
  for (const [key, value] of Object.entries(config))
    settings["sktestlab.runtime." + key] = value;
  settings["sktestlab.tests.timeoutMs"] = 300000;
}
await writeFile(
  path.join(user, "User/settings.json"),
  JSON.stringify(settings),
);
const driver = path.join(root, "driver");
await mkdir(driver);
await writeFile(
  path.join(driver, "package.json"),
  JSON.stringify({
    name: "acceptance-driver",
    publisher: "sktestlab-test",
    version: "1.0.0",
    engines: { vscode: "^1.96.0" },
  }),
);
const editor = await downloadAndUnzipVSCode("stable");
const profileArgs = [
  "--user-data-dir=" + user,
  "--extensions-dir=" + extensions,
];
const cli = async (args) => {
  if (process.platform === "win32") {
    const launcher = resolveCliPathFromVSCodeExecutablePath(editor);
    const text = await readFile(launcher, "utf8");
    const relative = /"%~dp0([^\"]+cli\.js)"/i.exec(text)?.[1];
    if (!relative)
      throw new Error("Cannot locate official VS Code CLI entry point");
    const script = path.resolve(path.dirname(launcher), relative);
    return {
      stdout: await run(editor, [script, ...profileArgs, ...args], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", VSCODE_DEV: "" },
      }),
    };
  }
  return runVSCodeCommand([...profileArgs, ...args], {
    version: "stable",
    reuseMachineInstall: true,
  });
};
const baseline = new Map();
for (const name of await readdir(workspace))
  baseline.set(
    name,
    createHash("sha256")
      .update(await readFile(path.join(workspace, name)))
      .digest("hex"),
  );
async function launch(stage, expectedVersion, runtime) {
  const output = path.join(root, stage + ".json");
  const logs = await run(
    editor,
    [
      workspace,
      ...profileArgs,
      "--extensionDevelopmentPath=" + driver,
      "--extensionTestsPath=" +
        path.resolve("out/integration/distribution.smoke.js"),
      "--disable-workspace-trust",
      "--disable-gpu",
      "--no-sandbox",
      "--skip-welcome",
      "--skip-release-notes",
    ],
    {
      env: {
        ...process.env,
        SKTESTLAB_ACCEPT_STAGE: stage,
        SKTESTLAB_ACCEPT_VERSION: expectedVersion,
        SKTESTLAB_ACCEPT_EXTENSIONS: extensions,
        SKTESTLAB_ACCEPT_RUNTIME: String(runtime),
        SKTESTLAB_ACCEPT_OUTPUT: output,
        SKTESTLAB_ACCEPT_PREVIOUS: path.join(root, "previous.json"),
      },
    },
  );
  await writeFile(path.join(root, stage + "-editor.log"), logs);
  return JSON.parse(await readFile(output, "utf8"));
}
const stages = {};
const previous = process.env.SKTESTLAB_ACCEPT_PREVIOUS_VSIX;
if (previous) {
  await cli(["--install-extension", path.resolve(previous), "--force"]);
  const list = await cli(["--list-extensions", "--show-versions"]);
  const old = /dheaven\.sktestlab@([^\s]+)/.exec(list.stdout)?.[1];
  if (!old) throw new Error("Old extension was not installed");
  stages.previous = await launch("previous", old, false);
}
await cli([
  "--install-extension",
  path.join(extracted, `sktestlab-win32-x64-${version}.vsix`),
  "--force",
]);
stages.current = await launch(
  previous ? "upgrade" : "fresh",
  version,
  !!process.env.SKTESTLAB_ACCEPT_RUNTIME_CONFIG,
);
// Exercise the real installed offline CLI against a known failure and its JUnit export.
const installed = stages.current.installedPath;
const fixture = JSON.parse(
  await readFile(path.join(workspace, "offline.sktest.json"), "utf8"),
);
fixture.assertions = [
  { kind: "symbol", operator: "contains", expected: "missingFromAcceptance" },
];
const failure = path.join(workspace, "cli-failure.sktest.json");
await writeFile(failure, JSON.stringify(fixture));
let failedAsExpected = false;
try {
  await run(
    process.execPath,
    [
      path.join(installed, "dist/cli.js"),
      failure,
      "--junit=" + path.join(root, "failed.xml"),
    ],
    { cwd: workspace },
  );
} catch (error) {
  if (!String(error).includes("Exit 1")) throw error;
  failedAsExpected = true;
}
await (await import("node:fs/promises")).unlink(failure);
if (
  !failedAsExpected ||
  !(await readFile(path.join(root, "failed.xml"), "utf8")).includes(
    '<failure message="Assertion failed">',
  )
)
  throw new Error("Failure export did not report a failure");
await cli(["--uninstall-extension", "dheaven.sktestlab"]);
if ((await cli(["--list-extensions"])).stdout.includes("dheaven.sktestlab"))
  throw new Error("Uninstall failed");
for (const [name, hash] of baseline)
  if (
    createHash("sha256")
      .update(await readFile(path.join(workspace, name)))
      .digest("hex") !== hash
  )
    throw new Error("Project file changed: " + name);
if ((await readdir(workspace)).length !== baseline.size)
  throw new Error("Unexpected project files remained");
const environments = path.join(
  user,
  "User/globalStorage/dheaven.sktestlab/runtime",
);
try {
  if ((await readdir(environments)).length)
    throw new Error("Runtime environments remain");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await writeFile(
  path.join(root, "evidence.json"),
  JSON.stringify(
    {
      version,
      bundle,
      stages,
      failedExport: true,
      uninstalled: true,
      projectHashesPreserved: true,
      runtimeConfigured: !!process.env.SKTESTLAB_ACCEPT_RUNTIME_CONFIG,
      completedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Distribution acceptance passed: " + root);
