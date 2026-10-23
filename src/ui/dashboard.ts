import * as vscode from "vscode";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { History } from "../testing/history";
import { Testing } from "../extension/testing";
import { Diagnostics } from "../extension/diagnostics";
import { runtimeConfig } from "../extension/configuration";
import { safeTarget } from "../security/paths";
import {
  DashboardData,
  dashboardActions,
  parseDashboardMessage,
  workspaceRuns,
  dashboardTheme,
  DashboardTheme,
} from "./dashboardModel";
import { renderDashboard } from "./dashboardHtml";

export class Dashboard implements vscode.Disposable {
  private view?: vscode.WebviewPanel;
  private listeners: vscode.Disposable[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private rendering = false;
  private again = false;
  private selectedId?: string;
  private data?: DashboardData;
  private ready = new vscode.EventEmitter<void>();
  readonly onDidReady = this.ready.event;
  get panel() {
    return this.view;
  }
  constructor(
    private context: vscode.ExtensionContext,
    private history: History,
    private testing: Testing,
    private diagnostics: Diagnostics,
  ) {
    this.listeners.push(
      testing.onDidChange(() => this.schedule()),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("sktestlab")) this.schedule();
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.selectedId = undefined;
        this.schedule();
      }),
      vscode.languages.onDidChangeDiagnostics((e) => {
        if (e.uris.some((uri) => uri.path.endsWith(".sk"))) this.schedule();
      }),
      vscode.workspace.onDidGrantWorkspaceTrust(() => this.schedule()),
    );
  }
  async show() {
    if (this.view) {
      this.view.reveal(vscode.ViewColumn.One);
      await this.refresh();
      return;
    }
    const assets = vscode.Uri.joinPath(this.context.extensionUri, "assets");
    const view = vscode.window.createWebviewPanel(
      "sktestlab.dashboard",
      "SkTestLab · Overview",
      vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [assets] },
    );
    view.iconPath = vscode.Uri.joinPath(assets, "lab.svg");
    this.view = view;
    const messages = view.webview.onDidReceiveMessage(
      async (value: unknown) => {
        const message = parseDashboardMessage(value);
        if (!message) return;
        try {
          if (message.type === "ready") {
            this.ready.fire();
            return;
          }
          if (message.type === "theme") {
            await this.setTheme(message.theme);
            return;
          } else if (message.type === "action") {
            const selected =
              this.data?.runs.find((r) => r.id === this.selectedId) ??
              this.data?.runs[0];
            await vscode.commands.executeCommand(
              dashboardActions[message.action],
              ["export", "runFailed"].includes(message.action)
                ? selected?.id
                : undefined,
            );
          } else if (message.type === "selectRun") {
            if (!this.data?.runs.some((r) => r.id === message.id)) return;
            this.selectedId = message.id;
          } else if (message.type === "openSource") {
            const result = this.data?.runs.find((r) => r.id === message.runId)
              ?.results[message.index];
            if (!result) return;
            const folder = vscode.workspace.getWorkspaceFolder(
              vscode.Uri.file(result.file),
            );
            if (!folder || folder.uri.scheme !== "file") return;
            const finding = result.runtimeDiagnostics?.find(
              (d) =>
                d.severity !== "warning" && result.targets.includes(d.file),
            );
            const target = finding?.file ?? result.targets[0];
            if (!target) return;
            const file = await safeTarget(folder.uri.fsPath, target);
            const document = await vscode.workspace.openTextDocument(
              vscode.Uri.file(file),
            );
            const line = Math.min(
              Math.max(0, (finding?.line ?? 1) - 1),
              document.lineCount - 1,
            );
            await vscode.window.showTextDocument(document, {
              viewColumn: vscode.ViewColumn.Beside,
              selection: new vscode.Range(line, 0, line, 0),
            });
            return;
          }
          await this.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await view.webview.postMessage({ type: "error", message });
          void vscode.window.showErrorMessage("SkTestLab: " + message);
        }
      },
    );
    const visible = view.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) this.schedule();
    });
    view.onDidDispose(() => {
      messages.dispose();
      visible.dispose();
      if (this.view === view) this.view = undefined;
      clearTimeout(this.timer);
    });
    await this.refresh();
  }
  private schedule() {
    if (!this.view) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.refresh().catch((e) =>
        vscode.window.showErrorMessage("SkTestLab dashboard: " + String(e)),
      );
    }, 150);
  }
  async setTheme(theme: DashboardTheme) {
    await this.context.globalState.update(
      "dashboard.theme",
      dashboardTheme(theme),
    );
    await this.refresh();
  }
  async refresh() {
    if (!this.view) return;
    if (this.rendering) {
      this.again = true;
      return;
    }
    this.rendering = true;
    try {
      do {
        this.again = false;
        const view: vscode.WebviewPanel | undefined = this.view;
        if (!view) return;
        const folders = vscode.workspace.workspaceFolders ?? [];
        const runs = workspaceRuns(
          await this.history.list(),
          folders
            .filter((f) => f.uri.scheme === "file")
            .map((f) => f.uri.fsPath),
        );
        if (this.selectedId && !runs.some((r) => r.id === this.selectedId))
          this.selectedId = undefined;
        const config = runtimeConfig(folders[0]?.uri);
        const analysis = { files: 0, errors: 0, warnings: 0 };
        this.diagnostics.collection.forEach((_uri, items) => {
          analysis.files++;
          analysis.errors += items.filter(
            (d) => d.severity === vscode.DiagnosticSeverity.Error,
          ).length;
          analysis.warnings += items.filter(
            (d) => d.severity === vscode.DiagnosticSeverity.Warning,
          ).length;
        });
        this.data = {
          theme: dashboardTheme(
            this.context.globalState.get("dashboard.theme"),
          ),
          project: folders.length
            ? path.basename(folders[0].uri.fsPath) +
              (folders.length > 1 ? " + " + (folders.length - 1) : "")
            : "No workspace open",
          version: String(this.context.extension.packageJSON.version),
          counts: this.testing.counts,
          trusted: vscode.workspace.isTrusted,
          runtime: {
            java: !!config.javaPath.trim(),
            paper: !!config.paperJarPath,
            skript: !!config.skriptJarPath,
            eula: config.eulaAccepted,
          },
          analysis,
          runs,
          selectedId: this.selectedId,
          progress: this.testing.progress,
        };
        if (this.view !== view) return;
        const assets = vscode.Uri.joinPath(this.context.extensionUri, "assets");
        view.webview.html = renderDashboard(this.data, {
          style: view.webview
            .asWebviewUri(vscode.Uri.joinPath(assets, "dashboard.css"))
            .toString(),
          script: view.webview
            .asWebviewUri(vscode.Uri.joinPath(assets, "dashboard.js"))
            .toString(),
          nonce: randomBytes(24).toString("hex"),
        });
      } while (this.again);
    } finally {
      this.rendering = false;
    }
  }
  dispose() {
    clearTimeout(this.timer);
    this.view?.dispose();
    this.listeners.forEach((d) => d.dispose());
    this.ready.dispose();
  }
}
