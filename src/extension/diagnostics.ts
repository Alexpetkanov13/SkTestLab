import * as vscode from "vscode";
import {
  AnalysisCache,
  crossFileDuplicates,
  ruleDescriptions,
} from "../core/analyzer";
import { Analysis, Finding } from "../core/model";
import { config } from "./configuration";
export const range = (r: { line: number; start: number; end: number }) =>
  new vscode.Range(r.line, r.start, r.line, r.end);
export class Diagnostics implements vscode.Disposable {
  readonly collection =
    vscode.languages.createDiagnosticCollection("sktestlab");
  private cache = new AnalysisCache();
  private analyses = new Map<string, Analysis>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private disposables: vscode.Disposable[] = [];
  private batching = false;
  private dirty = new Set<vscode.TextDocument>();
  constructor() {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) =>
        this.schedule(e.document),
      ),
      vscode.workspace.onDidOpenTextDocument((d) => this.schedule(d)),
      vscode.workspace.onDidCloseTextDocument((d) => {
        const id = d.uri.toString();
        this.cache.delete(id);
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("sktestlab")) {
          this.cache.clear();
          this.collection.clear();
          for (const d of vscode.workspace.textDocuments) this.schedule(d);
        }
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.cache.clear();
        this.analyses.clear();
        this.collection.clear();
      }),
    );
    for (const d of vscode.workspace.textDocuments) this.schedule(d);
  }
  schedule(d: vscode.TextDocument) {
    if (!d.uri.path.endsWith(".sk")) return;
    if (this.batching) {
      this.dirty.add(d);
      return;
    }
    const id = d.uri.toString();
    clearTimeout(this.timers.get(id));
    this.timers.set(
      id,
      setTimeout(
        () => {
          this.timers.delete(id);
          this.analyze(d);
        },
        config(d.uri).get("analysis.debounceMs", 300),
      ),
    );
  }
  analyze(d: vscode.TextDocument, publish = true): Analysis | undefined {
    const c = config(d.uri);
    if (
      !c.get("enabled", true) ||
      !c.get("analysis.enabled", true) ||
      Buffer.byteLength(d.getText()) >
        c.get("analysis.maxFileSizeKb", 1024) * 1024
    ) {
      this.collection.delete(d.uri);
      this.analyses.delete(d.uri.toString());
      return;
    }
    const a = this.cache.get(d.uri.toString(), d.version, d.getText(), {
      disabledRules: c.get("analysis.disabledRules", []),
      maxDepth: c.get("analysis.maxDepth", 6),
      skriptVersion: c.get("compatibility.skriptVersion", ""),
    });
    this.analyses.set(d.uri.toString(), a);
    if (publish) this.publish();
    return a;
  }
  private publish() {
    const duplicates = crossFileDuplicates(this.analyses);
    for (const [id, a] of this.analyses) {
      const uri = vscode.Uri.parse(id),
        disabled = config(uri).get<string[]>("analysis.disabledRules", []);
      this.collection.set(
        uri,
        [...a.findings, ...(duplicates.get(id) ?? [])]
          .filter((f) => !disabled.includes(f.id))
          .map((f) => {
            const d = new vscode.Diagnostic(
              range(f.range),
              f.message + " [" + f.confidence + "]",
              f.severity === "error"
                ? vscode.DiagnosticSeverity.Error
                : f.severity === "warning"
                  ? vscode.DiagnosticSeverity.Warning
                  : vscode.DiagnosticSeverity.Information,
            );
            d.source = "SkTestLab";
            d.code = f.id;
            return d;
          }),
      );
    }
  }
  findings(uri: vscode.Uri): Finding[] {
    return this.analyses.get(uri.toString())?.findings ?? [];
  }
  async workspace() {
    if (this.batching) return;
    this.batching = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    try {
      for (const uri of await vscode.workspace.findFiles(
        "**/*.sk",
        "**/{node_modules,.git,.sktestlab}/**",
      )) {
        try {
          this.analyze(await vscode.workspace.openTextDocument(uri), false);
        } catch {
          /* File may have been deleted during enumeration. */
        }
      }
    } finally {
      for (const document of this.dirty)
        if (!document.isClosed) this.analyze(document, false);
      this.dirty.clear();
      this.batching = false;
      this.publish();
    }
  }
  summary() {
    return (
      [...this.analyses.values()].reduce(
        (sum, a) => sum + a.findings.length,
        0,
      ) +
      " findings across " +
      this.analyses.size +
      " analyzed files. Unknown syntax is not runtime-validated."
    );
  }
  dispose() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.collection.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
export function quickFixes(service: Diagnostics): vscode.Disposable {
  return vscode.languages.registerCodeActionsProvider(
    { pattern: "**/*.sk" },
    {
      provideCodeActions(document, r) {
        return service
          .findings(document.uri)
          .filter((f) => f.fix && range(f.range).intersection(r))
          .map((f) => {
            const action = new vscode.CodeAction(
              ruleDescriptions[f.id],
              vscode.CodeActionKind.QuickFix,
            );
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, range(f.fix!.range), f.fix!.text);
            return action;
          });
      },
    },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
  );
}
