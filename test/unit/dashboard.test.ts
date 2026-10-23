import { it, expect } from "vitest";
import path from "node:path";
import {
  DashboardData,
  parseDashboardMessage,
  dashboardTheme,
  regressions,
  summarize,
  workspaceRuns,
} from "../../src/ui/dashboardModel";
import { renderDashboard } from "../../src/ui/dashboardHtml";
import { runInsights, sameSelection } from "../../src/ui/insights";
import { RunRecord, TestResult, Status } from "../../src/testing/model";
const result = (status: Status, id = "one"): TestResult => ({
  id,
  name: "Test " + id,
  file: path.resolve("project/test.sktest.json"),
  mode: "offline",
  targets: ["source.sk"],
  status,
  durationMs: 5,
  assertions: [],
});
const run = (results: TestResult[], id = "run"): RunRecord => ({
  id,
  version: 1,
  startedAt: "2026-10-23T10:00:00Z",
  durationMs: 10,
  environment: {},
  results,
});
const data: DashboardData = {
  project: "Project",
  version: "0.1.2",
  trusted: true,
  counts: { total: 0, offline: 0, runtime: 0, templates: 0, invalid: 0 },
  runtime: { java: true, paper: false, skript: false, eula: false },
  analysis: { files: 0, errors: 0, warnings: 0 },
  runs: [],
};
const resources = {
  style: "https://local/assets/dashboard.css",
  script: "https://local/assets/dashboard.js",
  nonce: "secureNonce123",
};
it("accepts only named theme choices from the webview", () => {
  expect(parseDashboardMessage({ type: "theme", theme: "white" })).toEqual({
    type: "theme",
    theme: "white",
  });
  expect(
    parseDashboardMessage({ type: "theme", theme: ["dark"] }),
  ).toBeUndefined();
  expect(
    parseDashboardMessage({ type: "theme", theme: "url(evil)" }),
  ).toBeUndefined();
  expect(dashboardTheme({ theme: "dark" })).toBe("auto");
});
it("compares durations only for identical selections", () => {
  const a = run([result("passed")]);
  const b = { ...run([result("failed")]), durationMs: 30 };
  expect(sameSelection(a, b)).toBe(true);
  expect(runInsights(a, b).durationDelta).toBe(-20);
  expect(
    runInsights(a, run([result("passed", "unrelated")])).durationDelta,
  ).toBeUndefined();
  expect(runInsights(run([result("skipped")])).slowest).toBeUndefined();
});
it("renders actual assertions, version evidence and advanced result controls", () => {
  const r = {
    ...result("passed"),
    runtimeVersions: { minecraft: "1.21.11", skript: "2.16.0", java: "21" },
    assertions: [{ passed: true, message: "Reward is correct" }],
  };
  const html = renderDashboard({ ...data, runs: [run([r])] }, resources);
  expect(html).toContain("Reward is correct");
  expect(html).toContain("Minecraft 1.21.11");
  expect(html).toContain('id="mode-filter"');
  expect(html).toContain('id="result-sort"');
  expect(html).toContain("Pass rate · same test selection");
});
it("does not call skipped, cancelled, or unsupported tests passed", () => {
  const s = summarize(
    run(
      [
        "passed",
        "failed",
        "errored",
        "skipped",
        "cancelled",
        "unsupported",
        "not-executed",
      ].map((s, i) => result(s as Status, String(i))),
    ),
  );
  expect(s).toMatchObject({
    total: 7,
    passed: 1,
    failed: 1,
    errored: 1,
    other: 4,
    percent: 14,
  });
});
it("has no invented pass rate or metrics for an empty history", () => {
  const html = renderDashboard(data, resources);
  expect(html).toContain("Your next green check starts here.");
  expect(html).toContain("Run tests to see results");
  expect(html).not.toContain("100%");
  expect(html).toContain("Setup needs attention");
  expect(html).toContain("Analyze workspace to see findings");
  expect(html).toContain("Awaiting a run");
  expect(html).toContain('stroke-dasharray="0 100"');
});
it("shows measured run health and keeps results before analytics", () => {
  const html = renderDashboard(
    { ...data, runs: [run([result("passed"), result("skipped", "two")])] },
    resources,
  );
  expect(html).toContain("Execution incomplete");
  expect(html).toContain('stroke-dasharray="50 100"');
  expect(html.indexOf('id="results"')).toBeLessThan(
    html.indexOf('aria-label="Run insights"'),
  );
  expect(html).toContain("2 of 5 runtime settings selected");
});
it("compares failure regressions by file and ID rather than display name", () => {
  expect(regressions(run([result("failed")]), run([result("passed")]))).toBe(1);
  expect(regressions(run([result("skipped")]), run([result("passed")]))).toBe(
    0,
  );
  expect(
    regressions(run([result("failed", "other")]), run([result("passed")])),
  ).toBe(0);
});
it("scopes history without including sibling-project results", () => {
  const inside = result("passed");
  const outside = {
    ...result("failed", "two"),
    file: path.resolve("project-other/test.sktest.json"),
  };
  expect(
    workspaceRuns([run([inside, outside])], [path.resolve("project")])[0]
      .results,
  ).toEqual([inside]);
  expect(workspaceRuns([run([inside])], [])).toEqual([]);
});
it("renders selected historical results instead of always displaying the latest run", () => {
  const html = renderDashboard(
    {
      ...data,
      runs: [run([result("failed")], "new"), run([result("passed")], "old")],
      selectedId: "old",
    },
    resources,
  );
  expect(html).toContain("SELECTED RUN");
  expect(html).toContain('data-status="passed"');
  expect(html).not.toContain('data-status="failed"');
  expect(html).toMatch(/data-action="runFailed"[^>]*disabled/);
});
it("escapes all user-provided names, errors, logs, target names and assertion values", () => {
  const attack = '</script><img src=x onerror="alert(1)">';
  const r = {
    ...result("failed"),
    name: attack,
    error: attack,
    targets: [attack],
    log: attack,
    assertions: [
      { passed: false, message: attack, expected: attack, actual: attack },
    ],
    runtimeVersions: { minecraft: attack, skript: attack, java: attack },
  };
  const html = renderDashboard(
    { ...data, project: attack, runs: [run([r])] },
    resources,
  );
  expect(html).not.toContain("<img");
  expect(html).not.toContain("</script><img");
  expect(html).toContain("&lt;img");
  expect(html).toContain("EXPECTED");
  expect(html).toContain("RECEIVED");
});
it("uses nonce-gated local scripts/styles and no command URIs or inline handlers", () => {
  const html = renderDashboard(data, resources);
  expect(html).toContain("default-src 'none'");
  expect(html).toContain("script-src 'nonce-secureNonce123'");
  expect(html).not.toContain("unsafe-inline");
  expect(html).not.toMatch(/\bonclick\s*=/);
  expect(html).not.toContain("command:");
  expect(html).toContain('nonce="secureNonce123"');
});
it("calls a runtime configuration selected rather than claiming a verified server", () => {
  const html = renderDashboard(
    { ...data, runtime: { java: true, paper: true, skript: true, eula: true } },
    resources,
  );
  expect(html).toContain("Configuration selected");
  expect(html).toContain("A real test confirms server compatibility.");
  expect(html).not.toContain("Server verified");
});
it.each([
  null,
  [],
  { type: "action", action: "__proto__" },
  { type: "action", action: "workbench.action.terminal.new" },
  { type: "openSource", runId: "a", index: -1 },
  { type: "openSource", runId: "a", index: 1.2 },
  { type: "selectRun", id: "a".repeat(101) },
  { type: "openSource", path: "C:/private" },
])("rejects unsafe dashboard message %#", (value) =>
  expect(parseDashboardMessage(value)).toBeUndefined(),
);
it("accepts only the enumerated commands and bounded record references", () => {
  expect(parseDashboardMessage({ type: "action", action: "offline" })).toEqual({
    type: "action",
    action: "offline",
  });
  expect(
    parseDashboardMessage({ type: "openSource", runId: "record", index: 0 }),
  ).toEqual({ type: "openSource", runId: "record", index: 0 });
});
it("shows actual run progress without manufacturing completed results", () => {
  const html = renderDashboard(
    { ...data, progress: { completed: 2, total: 5, label: "Runtime test" } },
    resources,
  );
  expect(html).toContain("Running 2 / 5");
  expect(html).toContain("No completed run yet");
  expect(html).toMatch(/data-action="stop"/);
});
