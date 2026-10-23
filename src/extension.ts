import * as vscode from "vscode";
import path from "node:path";
import { Diagnostics, quickFixes } from "./extension/diagnostics";
import { Testing } from "./extension/testing";
import { History } from "./testing/history";
import { createTest, lenses } from "./extension/templates";
import {
  config,
  requireTrust,
  runtimeConfig,
  workspaceRoot,
} from "./extension/configuration";
import { validateRuntime } from "./runtime/environment";
import { Dashboard } from "./ui/dashboard";
import { LabView } from "./ui/labView";
import { workspaceRuns } from "./ui/dashboardModel";
import { report } from "./reports/reports";
import { contained } from "./security/paths";
import { listEnvironments, recoverEnvironment } from "./runtime/recovery";
export async function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("SkTestLab");
  const diagnostics = new Diagnostics();
  const history = new History(
    path.join(context.globalStorageUri.fsPath, "history"),
  );
  const testing = new Testing(context.globalStorageUri.fsPath, history, output);
  const dashboard = new Dashboard(context, history, testing, diagnostics);
  const lab = new LabView(testing);
  context.subscriptions.push(
    dashboard,
    lab,
    vscode.window.registerTreeDataProvider("sktestlab.lab", lab),
  );
  context.subscriptions.push(
    output,
    diagnostics,
    testing,
    quickFixes(diagnostics),
    lenses(),
  );
  const command = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "sktestlab." + id,
        async (...args: unknown[]) => {
          try {
            return await handler(...args);
          } catch (e) {
            output.appendLine(String(e));
            void vscode.window.showErrorMessage(
              "SkTestLab: " + (e instanceof Error ? e.message : String(e)),
            );
          }
        },
      ),
    );
  command("openDashboard", () => dashboard.show());
  command("analyzeCurrentFile", () => {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || !doc.uri.path.endsWith(".sk"))
      throw new Error("Open a .sk file first.");
    diagnostics.analyze(doc);
  });
  command("analyzeWorkspace", () => diagnostics.workspace());
  command("showDiagnosticsSummary", () =>
    vscode.window.showInformationMessage(diagnostics.summary()),
  );
  command("discoverTests", () => testing.discover());
  command("runAllTests", () => testing.run());
  command("runOfflineTests", () => testing.runOffline());
  command("runCurrentFileTests", (uri) =>
    testing.runFiltered("current", uri instanceof vscode.Uri ? uri : undefined),
  );
  command("runFailedTests", async (id) => {
    if (typeof id === "string") {
      const record = (await history.list()).find((r) => r.id === id);
      if (record) await testing.runRecordedFailures(record);
    } else await testing.runFiltered("failed");
  });
  command("runByTag", () => testing.runFiltered("tag"));
  command("rerunLastSelection", () => testing.runFiltered("last"));
  command("stopTests", () => testing.stop());
  command("recoverRuntimeEnvironments", async () => {
    requireTrust();
    const storage = path.join(context.globalStorageUri.fsPath, "runtime");
    const entries = await listEnvironments(storage);
    if (!entries.length) {
      void vscode.window.showInformationMessage(
        "No retained runtime environments found.",
      );
      return;
    }
    const selected = await vscode.window.showQuickPick(
      entries.map((entry) => ({
        label: `${entry.state === "recoverable" ? "$(trash)" : "$(lock)"} ${path.basename(entry.directory)}`,
        description: entry.state,
        detail: entry.reason,
        entry,
      })),
      {
        title:
          "Runtime recovery — live and uncertain environments are protected",
        matchOnDetail: true,
      },
    );
    if (!selected) return;
    if (selected.entry.state !== "recoverable" || !selected.entry.lease) {
      output.appendLine(
        selected.entry.directory + ": " + selected.entry.reason,
      );
      output.show();
      void vscode.window.showWarningMessage(
        selected.entry.reason + ". No files were removed.",
      );
      return;
    }
    const choice = await vscode.window.showWarningMessage(
      "Remove this disposable runtime environment and its generated world?\n" +
        selected.entry.directory,
      { modal: true },
      "Remove environment",
    );
    if (choice !== "Remove environment") return;
    await recoverEnvironment(
      storage,
      selected.entry.directory,
      selected.entry.lease.nonce,
    );
    void vscode.window.showInformationMessage(
      "Removed the verified inactive runtime environment.",
    );
  });
  command("createTest", (uri) =>
    createTest(uri instanceof vscode.Uri ? uri : undefined),
  );
  command("generateTestSuite", (uri) =>
    createTest(uri instanceof vscode.Uri ? uri : undefined, true),
  );
  command("openTestLogs", () => output.show());
  command("initializeProject", async () => {
    requireTrust();
    const root = workspaceRoot();
    const uri = vscode.Uri.joinPath(root.uri, ".sktestlab", "README.md");
    try {
      await vscode.workspace.fs.stat(uri);
      throw new Error("Project is already initialized.");
    } catch (e) {
      if (!(e instanceof vscode.FileSystemError && e.code === "FileNotFound"))
        throw e;
    }
    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(
        "# SkTestLab project\n\nCreate .sktest.json tests beside your .sk files. Paths are relative to this workspace folder.\n",
      ),
    );
    await vscode.window.showTextDocument(uri);
  });
  command("configureRuntime", async () => {
    requireTrust();
    const c = config();
    for (const [key, title] of [
      ["paperJarPath", "Select Paper server JAR"],
      ["skriptJarPath", "Select Skript plugin JAR"],
    ]) {
      const selected = await vscode.window.showOpenDialog({
        title,
        canSelectMany: false,
        filters: { "Java archives": ["jar"] },
      });
      if (!selected) return;
      await c.update(
        "runtime." + key,
        selected[0].fsPath,
        vscode.ConfigurationTarget.Global,
      );
    }
    const java = await vscode.window.showInputBox({
      title: "Java executable on this extension host",
      value: c.get("runtime.javaPath", "java"),
    });
    if (java)
      await c.update(
        "runtime.javaPath",
        java,
        vscode.ConfigurationTarget.Global,
      );
    const accepted = await vscode.window.showInformationMessage(
      "Read the Minecraft EULA at https://www.minecraft.net/eula. Do you accept it for disposable SkTestLab servers?",
      { modal: true },
      "I accept",
      "Open EULA",
    );
    if (accepted === "Open EULA")
      await vscode.env.openExternal(
        vscode.Uri.parse("https://www.minecraft.net/eula"),
      );
    if (accepted === "I accept")
      await c.update(
        "runtime.eulaAccepted",
        true,
        vscode.ConfigurationTarget.Global,
      );
  });
  command("validateRuntimeEnvironment", async () => {
    requireTrust();
    const version = await validateRuntime(runtimeConfig());
    output.appendLine(version);
    output.show();
    void vscode.window.showInformationMessage(
      "Java runs and configured JAR files exist. Server compatibility is confirmed only by an actual runtime test.",
    );
  });
  command("exportTestReport", async (selectedId) => {
    requireTrust();
    const roots = (vscode.workspace.workspaceFolders ?? [])
      .filter((f) => f.uri.scheme === "file")
      .map((f) => f.uri.fsPath);
    const runs = workspaceRuns(await history.list(), roots);
    const record =
      typeof selectedId === "string"
        ? runs.find((r) => r.id === selectedId)
        : (testing.latest ?? runs[0]);
    if (!record) throw new Error("Run tests before exporting a report.");
    const format = await vscode.window.showQuickPick(
      ["json", "html", "junit"],
      {
        title: "Report format",
        placeHolder: config().get("reports.defaultFormat", "json"),
      },
    );
    if (!format) return;
    const extension = format === "junit" ? "xml" : format;
    const root = workspaceRoot();
    const directory = contained(
      root.uri.fsPath,
      config(root.uri).get("reports.outputDirectory", ".sktestlab/reports"),
    );
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(
        path.join(directory, "sktestlab-" + record.id + "." + extension),
      ),
      filters: { Report: [extension] },
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(report(record, format as "json" | "html" | "junit")),
      );
      await vscode.window.showTextDocument(uri);
    }
  });
  command("clearTestHistory", async () => {
    requireTrust();
    if (
      (await vscode.window.showWarningMessage(
        "Delete all saved SkTestLab run history?",
        { modal: true },
        "Delete",
      )) === "Delete"
    )
      await history.clear();
  });
  command("openDocumentation", async () => {
    await vscode.commands.executeCommand(
      "markdown.showPreview",
      vscode.Uri.joinPath(context.extensionUri, "docs", "getting-started.md"),
    );
  });
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    40,
  );
  const updateStatus = () => {
    const results = testing.latest?.results ?? [],
      issues = results.filter((r) =>
        ["failed", "errored"].includes(r.status),
      ).length;
    status.text = testing.progress
      ? "$(sync~spin) SkTestLab · " +
        testing.progress.completed +
        "/" +
        testing.progress.total
      : issues
        ? "$(error) SkTestLab · " + issues + " issues"
        : results.length
          ? "$(beaker) SkTestLab · " +
            results.filter((r) => r.status === "passed").length +
            " passed"
          : "$(beaker) SkTestLab";
    status.tooltip =
      "Open SkTestLab dashboard\n" +
      testing.counts.total +
      " discovered tests · " +
      testing.counts.offline +
      " offline · " +
      testing.counts.runtime +
      " runtime";
  };
  updateStatus();
  context.subscriptions.push(testing.onDidChange(updateStatus));
  status.command = "sktestlab.openDashboard";
  status.show();
  context.subscriptions.push(status);
  await testing.discover();
  if (config().get("ui.openDashboardOnStartup", false)) await dashboard.show();
  return {
    controller: testing.controller,
    diagnostics: diagnostics.collection,
    testing,
    dashboard,
  };
}
export function deactivate() {}
