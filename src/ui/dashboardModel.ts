import path from "node:path";
import { RunRecord, Status } from "../testing/model";

export interface LabCounts {
  total: number;
  offline: number;
  runtime: number;
  templates: number;
  invalid: number;
}
export interface LabProgress {
  completed: number;
  total: number;
  label: string;
}
export interface DashboardData {
  theme?: DashboardTheme;
  project: string;
  version: string;
  counts: LabCounts;
  trusted: boolean;
  runtime: { java: boolean; paper: boolean; skript: boolean; eula: boolean };
  analysis: { files: number; errors: number; warnings: number };
  runs: RunRecord[];
  selectedId?: string;
  progress?: LabProgress;
}
export type DashboardTheme = "auto" | "white" | "dark";
export function dashboardTheme(value: unknown): DashboardTheme {
  return value === "white" || value === "dark" ? value : "auto";
}
export function summarize(run?: RunRecord) {
  const results = run?.results ?? [];
  const count = (status: Status) =>
    results.filter((r) => r.status === status).length;
  const passed = count("passed"),
    failed = count("failed"),
    errored = count("errored");
  return {
    total: results.length,
    passed,
    failed,
    errored,
    other: results.length - passed - failed - errored,
    percent: results.length ? Math.round((passed / results.length) * 100) : 0,
  };
}
export function regressions(
  current: RunRecord | undefined,
  previous: RunRecord | undefined,
): number {
  return (
    current?.results.filter(
      (r) =>
        ["failed", "errored"].includes(r.status) &&
        previous?.results.some(
          (p) => p.file === r.file && p.id === r.id && p.status === "passed",
        ),
    ).length ?? 0
  );
}
export function belongsToWorkspace(file: string, roots: string[]): boolean {
  return roots.some((root) => {
    const relative = path.relative(root, file);
    return (
      relative !== ".." &&
      !relative.startsWith(".." + path.sep) &&
      !path.isAbsolute(relative)
    );
  });
}
/** History can contain results from other projects and mixed multi-root runs. */
export function workspaceRuns(runs: RunRecord[], roots: string[]): RunRecord[] {
  return runs.flatMap((run) => {
    const results = run.results.filter((r) =>
      belongsToWorkspace(r.file, roots),
    );
    return results.length ? [{ ...run, results }] : [];
  });
}
export function duration(ms: number): string {
  return ms < 1000
    ? Math.round(ms) + " ms"
    : ms < 60000
      ? (ms / 1000).toFixed(1) + " s"
      : Math.floor(ms / 60000) + "m " + Math.round((ms % 60000) / 1000) + "s";
}
export const dashboardActions = {
  runAll: "sktestlab.runAllTests",
  offline: "sktestlab.runOfflineTests",
  runFailed: "sktestlab.runFailedTests",
  discover: "sktestlab.discoverTests",
  analyze: "sktestlab.analyzeWorkspace",
  configure: "sktestlab.configureRuntime",
  validate: "sktestlab.validateRuntimeEnvironment",
  export: "sktestlab.exportTestReport",
  logs: "sktestlab.openTestLogs",
  docs: "sktestlab.openDocumentation",
  stop: "sktestlab.stopTests",
  createTest: "sktestlab.createTest",
  recovery: "sktestlab.recoverRuntimeEnvironments",
} as const;
export type DashboardMessage =
  | { type: "theme"; theme: DashboardTheme }
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "action"; action: keyof typeof dashboardActions }
  | { type: "selectRun"; id: string }
  | { type: "openSource"; runId: string; index: number };
export function parseDashboardMessage(
  value: unknown,
): DashboardMessage | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const m = value as Record<string, unknown>;
  if (
    m.type === "theme" &&
    typeof m.theme === "string" &&
    ["auto", "white", "dark"].includes(m.theme)
  )
    return { type: "theme", theme: m.theme as DashboardTheme };
  if (m.type === "ready" || m.type === "refresh") return { type: m.type };
  if (
    m.type === "action" &&
    typeof m.action === "string" &&
    Object.hasOwn(dashboardActions, m.action)
  )
    return {
      type: "action",
      action: m.action as keyof typeof dashboardActions,
    };
  if (m.type === "selectRun" && typeof m.id === "string" && m.id.length <= 100)
    return { type: "selectRun", id: m.id };
  if (
    m.type === "openSource" &&
    typeof m.runId === "string" &&
    m.runId.length <= 100 &&
    typeof m.index === "number" &&
    Number.isInteger(m.index) &&
    m.index >= 0 &&
    m.index < 100000
  )
    return { type: "openSource", runId: m.runId, index: m.index };
}
