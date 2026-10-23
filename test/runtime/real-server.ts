import { readFile, readdir, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { PaperProvider } from "../../src/providers/paper";
import { runTests } from "../../src/testing/runner";
import { safeTarget } from "../../src/security/paths";
import { RuntimeConfig } from "../../src/runtime/environment";
import { TestCase, RunRecord } from "../../src/testing/model";

async function main() {
  const server = process.env.SKTESTLAB_RUNTIME_SERVER;
  if (!server || !path.isAbsolute(server))
    throw new Error(
      "Set SKTESTLAB_RUNTIME_SERVER to an absolute existing test-server directory. Its eula.txt must already record acceptance.",
    );
  const one = (files: string[], pattern: RegExp, label: string) => {
    const matches = files.filter((f) => pattern.test(f));
    if (matches.length !== 1)
      throw new Error(
        "Select exactly one " +
          label +
          " JAR, or set its explicit SKTESTLAB_*_JAR path",
      );
    return matches[0];
  };
  const root = process.cwd();
  const config: RuntimeConfig = {
    javaPath: process.env.SKTESTLAB_RUNTIME_JAVA ?? "java",
    paperJarPath:
      process.env.SKTESTLAB_PAPER_JAR ??
      path.join(server, one(await readdir(server), /^paper.*\.jar$/i, "Paper")),
    skriptJarPath:
      process.env.SKTESTLAB_SKRIPT_JAR ??
      path.join(
        server,
        "plugins",
        one(
          await readdir(path.join(server, "plugins")),
          /^skript(?:-|\.jar).*$/i,
          "Skript",
        ),
      ),
    addonJarPaths: JSON.parse(
      process.env.SKTESTLAB_ADDON_JARS ?? "[]",
    ) as string[],
    memoryMb: 2048,
    startupTimeoutMs: 180000,
    keepEnvironment: false,
    eulaAccepted: /^eula=true\s*$/m.test(
      await readFile(path.join(server, "eula.txt"), "utf8"),
    ),
    dependencyCachePath: server,
  };
  await mkdir(".vscode-test", { recursive: true });
  const output = await mkdtemp(path.resolve(".vscode-test/runtime-real-"));
  const storage = path.join(output, "environments");
  const economy = JSON.parse(
    await readFile("examples/economy/script.sktest.json", "utf8"),
  ) as TestCase;
  const cases: {
    label: string;
    expected: string;
    test: TestCase;
    cancel?: boolean;
  }[] = [
    { label: "passing-project-function", expected: "passed", test: economy },
    {
      label: "failing-assertion",
      expected: "failed",
      test: {
        ...economy,
        assertions: [
          {
            condition: "{sktestlab::balance} is 71",
            message: "Intentional mismatch: correct result is 70",
          },
        ],
      },
    },
    {
      label: "parser-error",
      expected: "errored",
      test: {
        schemaVersion: 1,
        id: "parse-error",
        name: "Invalid script cannot pass",
        mode: "runtime",
        targets: ["test/fixtures/runtime/invalid.sk"],
        assertions: [{ condition: "true is true" }],
      },
    },
    {
      label: "warning-only",
      expected: "passed",
      test: {
        schemaVersion: 1,
        id: "warning-only",
        name: "Recognized warnings do not become errors",
        mode: "runtime",
        targets: ["test/fixtures/runtime/warning.sk"],
        assertions: [{ condition: 'warningFixture() is "a"' }],
      },
    },
    {
      label: "startup-cancellation",
      expected: "cancelled",
      test: economy,
      cancel: true,
    },
  ];
  const records: RunRecord[] = [];
  for (const item of cases) {
    console.log("Starting " + item.label);
    const signal = new AbortController();
    const log = path.join(output, item.label + ".log");
    let cancelled = false;
    const provider = new PaperProvider(
      config,
      storage,
      () => true,
      (line) => {
        appendFileSync(log, line + "\n");
        if (
          item.cancel &&
          !cancelled &&
          /Starting minecraft server version/.test(line)
        ) {
          cancelled = true;
          signal.abort();
        }
      },
    );
    const record = await runTests(
      [{ file: item.label, test: { ...item.test, timeoutMs: 300000 } }],
      [provider],
      {
        root,
        signal: signal.signal,
        read: async (target) =>
          readFile(await safeTarget(root, target), "utf8"),
      },
    );
    records.push(record);
    const result = record.results[0];
    console.log(
      item.label + ": " + result.status + " (expected " + item.expected + ")",
    );
    if (result.status !== item.expected) process.exitCode = 1;
    if (item.label === "parser-error" && result.assertions.length !== 0)
      process.exitCode = 1;
    if (
      item.label === "warning-only" &&
      !result.runtimeDiagnostics?.some((d) => d.severity === "warning")
    )
      process.exitCode = 1;
  }
  const remaining = await readdir(storage);
  if (remaining.length) process.exitCode = 1;
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        server,
        java: config.javaPath,
        records,
        remainingEnvironments: remaining,
      },
      null,
      2,
    ),
  );
  console.log("Runtime evidence: " + output);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
