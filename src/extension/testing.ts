import * as vscode from "vscode";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { parseTest, stableId } from "../testing/discovery";
import { RunRecord, TestCase, TestResult } from "../testing/model";
import { runTests } from "../testing/runner";
import { OfflineProvider } from "../providers/offline";
import { PaperProvider } from "../providers/paper";
import { safeTarget } from "../security/paths";
import { History } from "../testing/history";
import { config, runtimeConfig, workspaceRoot } from "./configuration";
import type { LabCounts, LabProgress } from "../ui/dashboardModel";
interface Entry {
  item: vscode.TestItem;
  test: TestCase;
  file: vscode.Uri;
}
export class Testing implements vscode.Disposable {
  readonly controller = vscode.tests.createTestController(
    "sktestlab",
    "SkTestLab",
  );
  readonly runtimeDiagnostics =
    vscode.languages.createDiagnosticCollection("sktestlab-runtime");
  private entries = new Map<string, Entry>();
  private disposables: vscode.Disposable[] = [];
  private abort?: AbortController;
  private last: string[] = [];
  private failed: string[] = [];
  private discovering?: Promise<void>;
  latest?: RunRecord;
  private changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;
  progress?: LabProgress;
  get counts(): LabCounts {
    const entries = [...this.entries.values()];
    let invalid = 0;
    const visit = (item: vscode.TestItem) => {
      if (item.error) invalid++;
      item.children.forEach(visit);
    };
    this.controller.items.forEach(visit);
    return {
      total: entries.length,
      offline: entries.filter((e) => e.test.mode === "offline").length,
      runtime: entries.filter((e) => e.test.mode === "runtime").length,
      templates: entries.filter((e) => e.test.template).length,
      invalid,
    };
  }
  constructor(
    private storage: string,
    readonly history: History,
    private output: vscode.OutputChannel,
  ) {
    this.controller.resolveHandler = () => this.discover();
    this.controller.refreshHandler = () => this.discover();
    this.controller.createRunProfile(
      "Run tests",
      vscode.TestRunProfileKind.Run,
      (request, token) => this.run(request, token),
      true,
    );
    const watcher =
      vscode.workspace.createFileSystemWatcher("**/*.sktest.json");
    const refresh = () => {
      void this.discover().catch((e) => this.output.appendLine(String(e)));
    };
    this.disposables.push(
      watcher,
      watcher.onDidCreate(refresh),
      watcher.onDidChange(refresh),
      watcher.onDidDelete(refresh),
      vscode.workspace.onDidChangeWorkspaceFolders(refresh),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("sktestlab.tests")) refresh();
      }),
    );
  }
  discover(): Promise<void> {
    if (this.discovering) return this.discovering;
    this.discovering = this.load().finally(
      () => (this.discovering = undefined),
    );
    return this.discovering;
  }
  private async load() {
    const roots: vscode.TestItem[] = [];
    const entries = new Map<string, Entry>();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const c = config(folder.uri);
      if (!c.get("enabled", true) || folder.uri.scheme !== "file") continue;
      const root = this.controller.createTestItem(
        folder.uri.toString(),
        folder.name,
        folder.uri,
      );
      roots.push(root);
      const folders = new Map<string, vscode.TestItem>();
      for (const file of await vscode.workspace.findFiles(
        new vscode.RelativePattern(
          folder,
          c.get("tests.include", "**/*.sktest.json"),
        ),
        c.get("tests.exclude", "**/{node_modules,.git,.sktestlab}/**"),
      )) {
        const relative = path.relative(folder.uri.fsPath, file.fsPath);
        const dir = path.dirname(relative);
        let parent = root;
        if (dir !== ".") {
          let current = "";
          for (const part of dir.split(path.sep)) {
            current = current ? path.join(current, part) : part;
            let item = folders.get(current);
            if (!item) {
              item = this.controller.createTestItem(
                folder.uri.toString() + "/" + current,
                part,
              );
              folders.set(current, item);
              parent.children.add(item);
            }
            parent = item;
          }
        }
        const group = this.controller.createTestItem(
          file.toString(),
          path.basename(file.fsPath),
          file,
        );
        parent.children.add(group);
        try {
          const text = Buffer.from(
            await vscode.workspace.fs.readFile(file),
          ).toString("utf8");
          const test = parseTest(text, folder.uri.fsPath);
          const item = this.controller.createTestItem(
            stableId(file.toString(), test.id),
            test.name,
            file,
          );
          const line = text
            .split(/\r?\n/)
            .findIndex((l) => /"name"\s*:/.test(l));
          item.range = new vscode.Range(
            Math.max(0, line),
            0,
            Math.max(0, line),
            0,
          );
          item.tags = (test.tags ?? []).map((t) => new vscode.TestTag(t));
          item.description = test.template ? "Incomplete template" : test.mode;
          group.children.add(item);
          entries.set(item.id, { item, test, file });
        } catch (e) {
          group.error = String(e);
          this.output.appendLine(file.fsPath + ": " + String(e));
        }
      }
    }
    this.entries = entries;
    this.controller.items.replace(roots);
    this.changed.fire();
  }
  private descendants(item: vscode.TestItem): string[] {
    if (this.entries.has(item.id)) return [item.id];
    const ids: string[] = [];
    item.children.forEach((c) => ids.push(...this.descendants(c)));
    return ids;
  }
  async run(
    request = new vscode.TestRunRequest(),
    token?: vscode.CancellationToken,
  ) {
    if (this.abort) {
      void vscode.window.showWarningMessage(
        "A SkTestLab run is already active.",
      );
      return;
    }
    if (!this.entries.size) await this.discover();
    const selected = request.include
      ? request.include.flatMap((i) => this.descendants(i))
      : [...this.entries.keys()];
    const excluded = new Set(
      request.exclude?.flatMap((i) => this.descendants(i)) ?? [],
    );
    const ids = [...new Set(selected)].filter((id) => !excluded.has(id));
    // Watcher refreshes must not remove queued items from an active run.
    const snapshot = new Map(this.entries);
    this.last = ids;
    const abort = new AbortController();
    this.abort = abort;
    const subscription = token?.onCancellationRequested(() => abort.abort());
    if (token?.isCancellationRequested) abort.abort();
    const run = this.controller.createTestRun(request);
    const completed: TestResult[] = [];
    const began = Date.now();
    this.progress = {
      completed: 0,
      total: ids.length,
      label: "Preparing tests",
    };
    this.changed.fire();
    for (const id of ids) {
      const e = snapshot.get(id);
      if (e) run.enqueued(e.item);
    }
    try {
      for (const id of ids) {
        const entry = snapshot.get(id);
        if (!entry) continue;
        const { item, test, file } = entry;
        this.progress = {
          completed: completed.length,
          total: ids.length,
          label: test.name,
        };
        this.changed.fire();
        const root = workspaceRoot(file);
        const c = config(file);
        if (!c.get("enabled", true)) {
          run.skipped(item);
          completed.push({
            id: test.id,
            name: test.name,
            file: file.fsPath,
            mode: test.mode,
            targets: test.targets,
            status: "not-executed",
            durationMs: 0,
            assertions: [],
            error: "SkTestLab is disabled for this folder",
          });
          continue;
        }
        run.started(item);
        const effective = {
          ...test,
          timeoutMs: test.timeoutMs ?? c.get("tests.timeoutMs", 30000),
        };
        const record = await runTests(
          [{ file: file.fsPath, test: effective }],
          [
            new OfflineProvider(),
            new PaperProvider(
              runtimeConfig(file),
              path.join(this.storage, "runtime"),
              () => vscode.workspace.isTrusted,
              (l) => {
                if (c.get<string>("logging.level", "info") !== "error")
                  this.output.appendLine(l);
                run.appendOutput(l + "\r\n", undefined, item);
              },
            ),
          ],
          {
            root: root.uri.fsPath,
            signal: abort.signal,
            read: async (target) =>
              readFile(await safeTarget(root.uri.fsPath, target), "utf8"),
            disabledRules: c.get("analysis.disabledRules", []),
            skriptVersion: c.get("compatibility.skriptVersion", ""),
          },
        );
        const result = record.results[0];
        if (test.mode === "runtime") {
          for (const target of test.targets)
            this.runtimeDiagnostics.delete(
              vscode.Uri.file(path.resolve(root.uri.fsPath, target)),
            );
          for (const target of test.targets) {
            const findings = (result.runtimeDiagnostics ?? []).filter(
              (f) => f.file === target,
            );
            if (findings.length)
              this.runtimeDiagnostics.set(
                vscode.Uri.file(path.resolve(root.uri.fsPath, target)),
                findings.map((f) => {
                  const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(
                      Math.max(0, f.line - 1),
                      0,
                      Math.max(0, f.line - 1),
                      0,
                    ),
                    f.message,
                    f.severity === "warning"
                      ? vscode.DiagnosticSeverity.Warning
                      : vscode.DiagnosticSeverity.Error,
                  );
                  diagnostic.source =
                    f.severity === "unknown"
                      ? "SkTestLab runtime (unclassified, last run)"
                      : "SkTestLab runtime (last run)";
                  return diagnostic;
                }),
              );
          }
        }
        completed.push(result);
        this.progress = {
          completed: completed.length,
          total: ids.length,
          label: test.name,
        };
        this.changed.fire();
        if (result.status === "passed") run.passed(item, result.durationMs);
        else if (result.status === "failed") {
          const messages = result.assertions
            .filter((a) => !a.passed)
            .map((a) =>
              vscode.TestMessage.diff(
                a.message,
                JSON.stringify(a.expected),
                JSON.stringify(a.actual),
              ),
            );
          run.failed(item, messages, result.durationMs);
        } else if (result.status === "errored") {
          const messages = (result.runtimeDiagnostics ?? [])
            .filter((f) => f.severity !== "warning")
            .map((f) => {
              const message = new vscode.TestMessage(f.message);
              if (test.targets.includes(f.file))
                message.location = new vscode.Location(
                  vscode.Uri.file(path.resolve(root.uri.fsPath, f.file)),
                  new vscode.Position(Math.max(0, f.line - 1), 0),
                );
              return message;
            });
          run.errored(
            item,
            messages.length
              ? messages
              : new vscode.TestMessage(result.error ?? "Execution error"),
            result.durationMs,
          );
        } else {
          run.skipped(item);
          run.appendOutput(
            result.status + ": " + (result.error ?? "") + "\r\n",
            undefined,
            item,
          );
        }
      }
      this.latest = {
        version: 1,
        id: crypto.randomUUID(),
        startedAt: new Date(began).toISOString(),
        durationMs: Date.now() - began,
        results: completed,
        environment: {
          platform: process.platform,
          node: process.version,
          minecraftVersion: config().get(
            "compatibility.minecraftVersion",
            "unknown",
          ),
          skriptVersion: config().get("compatibility.skriptVersion", "unknown"),
        },
      };
      this.failed = ids.filter((id) =>
        completed.some(
          (r) =>
            r.file === snapshot.get(id)?.file.fsPath &&
            r.id === snapshot.get(id)?.test.id &&
            ["failed", "errored"].includes(r.status),
        ),
      );
      await this.history.save(this.latest);
    } catch (e) {
      this.output.appendLine(String(e));
      for (const id of ids) {
        const entry = snapshot.get(id);
        if (
          entry &&
          !completed.some(
            (r) => r.file === entry.file.fsPath && r.id === entry.test.id,
          )
        )
          run.errored(entry.item, new vscode.TestMessage(String(e)));
      }
      throw e;
    } finally {
      subscription?.dispose();
      this.abort = undefined;
      this.progress = undefined;
      this.changed.fire();
      run.end();
    }
  }
  async runFiltered(
    kind: "failed" | "last" | "current" | "tag",
    uri?: vscode.Uri,
  ) {
    await this.discover();
    let ids: string[];
    if (kind === "failed") ids = this.failed;
    else if (kind === "last") ids = this.last;
    else if (kind === "tag") {
      const tags = [
        ...new Set(
          [...this.entries.values()].flatMap((e) => e.test.tags ?? []),
        ),
      ];
      const tag = await vscode.window.showQuickPick(tags, {
        title: "Run tests with tag",
      });
      if (!tag) return;
      ids = [...this.entries]
        .filter(([, e]) => e.test.tags?.includes(tag))
        .map(([id]) => id);
    } else {
      uri ??= vscode.window.activeTextEditor?.document.uri;
      if (!uri) return;
      const file = uri.fsPath;
      ids = [...this.entries]
        .filter(
          ([, e]) =>
            e.file.fsPath === file ||
            e.test.targets.some(
              (t) => path.resolve(workspaceRoot(e.file).uri.fsPath, t) === file,
            ),
        )
        .map(([id]) => id);
    }
    await this.run(
      new vscode.TestRunRequest(
        ids
          .map((id) => this.entries.get(id)?.item)
          .filter((v): v is vscode.TestItem => !!v),
      ),
    );
  }
  stop() {
    this.abort?.abort();
  }
  async runOffline() {
    await this.discover();
    await this.run(
      new vscode.TestRunRequest(
        [...this.entries.values()]
          .filter((e) => e.test.mode === "offline")
          .map((e) => e.item),
      ),
    );
  }
  async runRecordedFailures(record: RunRecord) {
    await this.discover();
    const failures = record.results.filter((r) =>
      ["failed", "errored"].includes(r.status),
    );
    const items = [...this.entries.values()]
      .filter((e) =>
        failures.some(
          (r) =>
            r.id === e.test.id && path.relative(r.file, e.file.fsPath) === "",
        ),
      )
      .map((e) => e.item);
    await this.run(new vscode.TestRunRequest(items));
  }
  dispose() {
    this.stop();
    this.disposables.forEach((d) => d.dispose());
    this.controller.dispose();
    this.runtimeDiagnostics.dispose();
    this.changed.dispose();
  }
}
