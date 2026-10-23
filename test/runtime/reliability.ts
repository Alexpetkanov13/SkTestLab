import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PaperProvider } from "../../src/providers/paper";
import { RuntimeConfig } from "../../src/runtime/environment";
import {
  inspectEnvironment,
  listEnvironments,
  processAlive,
  recoverEnvironment,
} from "../../src/runtime/recovery";
import { runTests } from "../../src/testing/runner";
import { TestCase } from "../../src/testing/model";
import { safeTarget } from "../../src/security/paths";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function main() {
  const worker = process.argv[2] === "--worker";
  const configFile = worker
    ? process.argv[3]
    : process.env.SKTESTLAB_RELIABILITY_CONFIG;
  if (!configFile)
    throw new Error(
      "Set SKTESTLAB_RELIABILITY_CONFIG to an existing runtime configuration JSON with previously accepted EULA",
    );
  const config = JSON.parse(
    await readFile(configFile, "utf8"),
  ) as RuntimeConfig;
  const root = process.cwd();
  const test: TestCase = {
    schemaVersion: 1,
    id: "delayed",
    name: "Delayed runtime action",
    mode: "runtime",
    targets: ["examples/economy/script.sk"],
    actions: ["wait 120 seconds"],
    assertions: [{ condition: "true is true" }],
    timeoutMs: 300000,
  };
  if (worker) {
    const provider = new PaperProvider(
      { ...config, keepEnvironment: false },
      process.argv[4],
      () => true,
      (line) => {
        appendFileSync(process.argv[5], line + "\n");
        if (line.includes("|BEGIN")) process.stdout.write("HARNESS_STARTED\n");
      },
    );
    await provider.execute(test, {
      root,
      signal: new AbortController().signal,
      read: async (target) => readFile(await safeTarget(root, target), "utf8"),
    });
    return;
  }
  await mkdir(".vscode-test", { recursive: true });
  const output = await mkdtemp(path.resolve(".vscode-test/reliability-real-"));
  const storage = path.join(output, "environments");
  const records = [];
  for (const label of [
    "cancel-during-action-1",
    "cancel-during-action-2",
    "action-timeout",
  ]) {
    const controller = new AbortController();
    const provider = new PaperProvider(
      { ...config, keepEnvironment: false },
      storage,
      () => true,
      (line) => {
        appendFileSync(path.join(output, label + ".log"), line + "\n");
        if (label.startsWith("cancel") && line.includes("|BEGIN"))
          controller.abort();
      },
    );
    const record = await runTests(
      [
        {
          file: label,
          test: {
            ...test,
            timeoutMs: label === "action-timeout" ? 60000 : 300000,
          },
        },
      ],
      [provider],
      {
        root,
        signal: controller.signal,
        read: async (target) =>
          readFile(await safeTarget(root, target), "utf8"),
      },
    );
    records.push(record);
    const result = record.results[0];
    if (
      label === "action-timeout" &&
      !(await readFile(path.join(output, label + ".log"), "utf8")).includes(
        "|BEGIN",
      )
    )
      throw new Error(
        "Timeout occurred before actions began; cannot claim action-timeout coverage",
      );
    const expected = label === "action-timeout" ? "errored" : "cancelled";
    if (
      result.status !== expected ||
      (label === "action-timeout" && result.error !== "Test timed out")
    )
      throw new Error(label + ": unexpected " + JSON.stringify(result));
    if ((await listEnvironments(storage)).length)
      throw new Error("Cancellation/timeout left an environment");
    console.log(label + ": " + result.status);
    await writeFile(
      path.join(output, "results.json"),
      JSON.stringify({ records }, null, 2),
    );
  }
  const orphanStorage = path.join(output, "orphan");
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(import.meta.url),
      "--worker",
      path.resolve(configFile),
      orphanStorage,
      path.join(output, "orphan.log"),
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let serverPid: number | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Crash-test worker did not reach its harness")),
        240000,
      );
      child.stdout.on("data", (chunk) => {
        if (String(chunk).includes("HARNESS_STARTED")) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.stderr.on("data", (chunk) =>
        appendFileSync(path.join(output, "worker.log"), chunk),
      );
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        reject(new Error("Worker closed early: " + code));
      });
    });
    const entries = await listEnvironments(orphanStorage);
    const entry = entries[0];
    if (
      entries.length !== 1 ||
      entry.state !== "active" ||
      !entry.lease?.serverPid
    )
      throw new Error("Expected one protected live environment");
    serverPid = entry.lease.serverPid;
    const ownerClosed = new Promise<void>((resolve) =>
      child.once("close", () => resolve()),
    );
    child.kill("SIGKILL");
    await ownerClosed;
    const afterCrash = await inspectEnvironment(orphanStorage, entry.directory);
    if (processAlive(serverPid)) {
      if (afterCrash.state !== "active")
        throw new Error("Live orphan was not protected");
      let refused = false;
      try {
        await recoverEnvironment(
          orphanStorage,
          entry.directory,
          entry.lease.nonce,
        );
      } catch {
        refused = true;
      }
      if (!refused) throw new Error("Recovery removed a live orphan");
      // This is a Java process created solely by this disposable crash test.
      // Production recovery never terminates a PID.
      process.kill(serverPid, "SIGKILL");
    }
    for (let i = 0; i < 100 && processAlive(serverPid); i++) await pause(100);
    if (processAlive(serverPid))
      throw new Error("Crash-test Java process did not terminate");
    await recoverEnvironment(orphanStorage, entry.directory, entry.lease.nonce);
    if ((await readdir(orphanStorage)).length)
      throw new Error("Orphan recovery left files");
    await writeFile(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          records,
          crashRecovery: {
            ownerPid: child.pid,
            serverPid,
            whileAlive: entry.state,
            afterCrash: afterCrash.state,
            recovered: true,
          },
        },
        null,
        2,
      ),
    );
    console.log(
      "Owner crash: live PID protected; inactive owned directory recovered",
    );
  } finally {
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
    if (serverPid && processAlive(serverPid))
      process.kill(serverPid, "SIGKILL");
  }
  console.log("Reliability evidence: " + output);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
