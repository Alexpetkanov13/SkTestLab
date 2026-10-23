import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface Result {
  status: string;
  name: string;
  error?: string;
  runtimeDiagnostics?: { file: string; line: number; severity: string }[];
}
interface Record {
  results: Result[];
}
interface Api {
  controller: vscode.TestController;
  diagnostics: vscode.DiagnosticCollection;
  testing: {
    latest?: Record;
    runtimeDiagnostics: vscode.DiagnosticCollection;
    run: (request: vscode.TestRunRequest) => Promise<void>;
  };
}
suite("Read-only real project verification", () => {
  let api: Api;
  const project = process.env.SKTESTLAB_PROJECT_ROOT!;
  const isOriginal = (item: vscode.TestItem) =>
    !!item.uri &&
    vscode.workspace.getWorkspaceFolder(item.uri)?.name === "Original project";
  const report: {
    diagnostics?: unknown;
    offline?: Record;
    runtimePreflight?: Record;
    runtime?: Record;
    analysisMs?: number;
  } = {};
  const leaves = () => {
    const items: vscode.TestItem[] = [];
    const visit = (item: vscode.TestItem) => {
      if (!item.children.size) items.push(item);
      else item.children.forEach(visit);
    };
    api.controller.items.forEach(visit);
    return items;
  };
  suiteSetup(async () => {
    api = await vscode.extensions.getExtension("dheaven.sktestlab")!.activate();
  });
  suiteTeardown(async () => {
    await writeFile(
      process.env.SKTESTLAB_PROJECT_REPORT!,
      JSON.stringify(report, null, 2),
    );
  });
  test("discovers both original definitions and executable snapshot tests", async () => {
    await vscode.commands.executeCommand("sktestlab.discoverTests");
    assert.ok(leaves().some((item) => item.description === "offline"));
    assert.ok(leaves().some(isOriginal));
  });
  test("analyzes the real files without structural errors", async function () {
    this.timeout(60000);
    const began = Date.now();
    await vscode.commands.executeCommand("sktestlab.analyzeWorkspace");
    report.analysisMs = Date.now() - began;
    const files: {
      file: string;
      findings: {
        id: unknown;
        message: string;
        line: number;
        severity: number;
      }[];
    }[] = [];
    api.diagnostics.forEach((uri, diagnostics) => {
      const relative = path.relative(project, uri.fsPath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) return;
      files.push({
        file: relative,
        findings: diagnostics.map((d) => ({
          id: d.code,
          message: d.message,
          line: d.range.start.line + 1,
          severity: d.severity,
        })),
      });
    });
    report.diagnostics = files;
    assert.ok(files.length > 0);
    assert.equal(
      files.flatMap((f) =>
        f.findings.filter(
          (d) => d.severity === vscode.DiagnosticSeverity.Error,
        ),
      ).length,
      0,
    );
  });
  test("executes all native offline snapshot checks", async function () {
    this.timeout(60000);
    await api.testing.run(
      new vscode.TestRunRequest(
        leaves().filter((i) => i.description === "offline"),
      ),
    );
    report.offline = api.testing.latest;
    assert.ok(report.offline?.results.length);
    for (const result of report.offline.results)
      assert.equal(result.status, "passed", result.name + ": " + result.error);
  });
  test("unconfigured original runtime tests cannot appear passed", async function () {
    this.timeout(30000);
    const items = leaves().filter(
      (i) => i.description === "runtime" && isOriginal(i),
    );
    if (!items.length) {
      this.skip();
      return;
    }
    assert.equal(
      vscode.workspace
        .getConfiguration("sktestlab")
        .get("runtime.eulaAccepted", false),
      false,
    );
    await api.testing.run(new vscode.TestRunRequest(items));
    report.runtimePreflight = api.testing.latest;
    assert.ok(report.runtimePreflight?.results.length);
    for (const result of report.runtimePreflight.results) {
      assert.equal(result.status, "errored");
      assert.match(result.error ?? "", /EULA/);
    }
  });
  test("reports actual server load errors at the original source locations", async function () {
    if (!process.env.SKTESTLAB_RUNTIME_CONFIG) {
      this.skip();
      return;
    }
    this.timeout(180000);
    const values = JSON.parse(
      await readFile(process.env.SKTESTLAB_RUNTIME_CONFIG, "utf8"),
    ) as { [key: string]: unknown };
    const settings = vscode.workspace.getConfiguration("sktestlab");
    try {
      for (const [key, value] of Object.entries(values))
        await settings.update(
          "runtime." + key,
          value,
          vscode.ConfigurationTarget.Global,
        );
      await settings.update(
        "tests.timeoutMs",
        150000,
        vscode.ConfigurationTarget.Global,
      );
      const items = leaves().filter(
        (i) => i.description === "runtime" && isOriginal(i),
      );
      assert.ok(items.length);
      await api.testing.run(new vscode.TestRunRequest(items));
      report.runtime = api.testing.latest;
      assert.ok(report.runtime?.results.length);
      for (const result of report.runtime.results) {
        assert.equal(result.status, "errored");
        assert.ok(
          result.runtimeDiagnostics?.some(
            (d) =>
              d.file === "credits.sk" &&
              d.line === 60 &&
              d.severity === "error",
          ),
        );
      }
      const source = vscode.Uri.file(path.join(project, "credits.sk"));
      assert.ok(
        api.testing.runtimeDiagnostics
          .get(source)
          ?.some((d) => d.range.start.line === 59),
      );
    } finally {
      for (const key of Object.keys(values))
        await settings.update(
          "runtime." + key,
          undefined,
          vscode.ConfigurationTarget.Global,
        );
      await settings.update(
        "tests.timeoutMs",
        undefined,
        vscode.ConfigurationTarget.Global,
      );
    }
  });
});
