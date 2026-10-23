import { compatibilityNotes } from "../runtime/compatibility";
import { runInsights, sameSelection } from "./insights";
import { escapeHtml as esc } from "../security/paths";
import { TestResult } from "../testing/model";
import {
  DashboardData,
  dashboardTheme,
  duration,
  regressions,
  summarize,
} from "./dashboardModel";

const icons: Record<string, string> = {
  lab: "M9 3h6m-5 0v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M8 14h8",
  play: "m9 5 11 7-11 7Z",
  check: "m5 12 4 4L19 6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  refresh:
    "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-5 2 2-14",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  server: "M4 3h16v7H4zm0 11h16v7H4zM7 6h.01M7 17h.01M11 6h6m-6 11h6",
  alert: "M12 8v5m0 3h.01M10 3 1 20h22L14 3Z",
  file: "M14 2H4v20h16V8zm0 0v6h6M8 13h8m-8 4h5",
  stop: "M5 5h14v14H5z",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  spark: "m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z",
};
export function icon(name: string): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] ?? icons.lab}"/></svg>`;
}
function button(
  action: string,
  label: string,
  symbol: string,
  primary = false,
  disabled = false,
) {
  return `<button class="button ${primary ? "primary" : ""}" data-action="${action}" ${disabled ? "disabled" : ""}>${icon(symbol)}${label}</button>`;
}
function statusLabel(status: string) {
  return status === "not-executed"
    ? "Not executed"
    : status.charAt(0).toUpperCase() + status.slice(1);
}
function resultHtml(result: TestResult, index: number, runId: string): string {
  const failed = result.assertions.filter((a) => !a.passed);
  const details = failed
    .map(
      (a) =>
        `<div class="assertion"><strong>${esc(a.message)}</strong><div class="diff"><div><span>EXPECTED</span><pre>${esc(JSON.stringify(a.expected, null, 2) ?? "Not available")}</pre></div><div><span>RECEIVED</span><pre>${esc(JSON.stringify(a.actual, null, 2) ?? "Not available")}</pre></div></div></div>`,
    )
    .join("");
  return `<details class="test-row" data-mode="${esc(result.mode)}" data-name="${esc(result.name.toLowerCase())}" data-duration="${result.durationMs}" data-order="${index}" data-status="${esc(result.status)}" data-search="${esc((result.name + " " + result.file + " " + result.targets.join(" ")).toLowerCase())}"><summary><span class="result-dot ${esc(result.status)}">${result.status === "passed" ? icon("check") : ["failed", "errored"].includes(result.status) ? "!" : "−"}</span><span class="test-name"><strong>${esc(result.name)}</strong><small>${esc(result.targets.join(" · "))}</small></span><span class="mode">${esc(result.mode)}</span><span class="status ${esc(result.status)}">${statusLabel(result.status)}</span><span class="test-time">${duration(result.durationMs)}</span><span class="chevron">⌄</span></summary><div class="test-detail">${result.error ? `<div class="error-message">${esc(result.error)}</div>` : ""}${details}${result.assertions.length ? `<details class="assertion-ledger"><summary>All assertions · ${result.assertions.filter((a) => a.passed).length}/${result.assertions.length} passed</summary><ul>${result.assertions.map((a) => `<li><span class="status ${a.passed ? "passed" : "failed"}">${a.passed ? "PASS" : "FAIL"}</span>${esc(a.message)}</li>`).join("")}</ul></details>` : ""}${
    result.runtimeVersions
      ? `<div class="version-evidence"><strong>Observed runtime</strong><span>Minecraft ${esc(result.runtimeVersions.minecraft ?? "unknown")} · Skript ${esc(result.runtimeVersions.skript ?? "unknown")} · Java ${esc(result.runtimeVersions.java ?? "unknown")}</span>${compatibilityNotes(
          result.runtimeVersions,
        )
          .map((note) => `<p>${esc(note)}</p>`)
          .join("")}</div>`
      : ""
  }${result.runtimeDiagnostics?.length ? `<ul class="runtime-findings">${result.runtimeDiagnostics.map((d) => `<li><span class="status ${d.severity === "warning" ? "other" : "errored"}">${esc(d.severity)}</span><code>${esc(d.file)}:${d.line}</code> ${esc(d.message)}</li>`).join("")}</ul>` : ""}${!result.error && !failed.length ? `<p class="muted">${result.assertions.length} assertion${result.assertions.length === 1 ? "" : "s"} ${result.status === "passed" ? "passed." : "recorded."}${result.mode === "offline" ? " Static expectations only; Skript was not executed." : ""}</p>` : ""}<div class="detail-footer"><button class="text-button" data-source="${index}" data-run="${esc(runId)}">${icon("file")}Open source</button>${result.log ? `<details class="log"><summary>Console excerpt</summary><pre>${esc(result.log.slice(-8000))}</pre></details>` : ""}</div></div></details>`;
}
export function renderDashboard(
  data: DashboardData,
  resources: { style: string; script: string; nonce: string },
): string {
  const selected =
    data.runs.find((r) => r.id === data.selectedId) ?? data.runs[0];
  const summary = summarize(selected),
    previous = selected
      ? data.runs[data.runs.indexOf(selected) + 1]
      : undefined;
  const regressionCount = regressions(selected, previous);
  const insights = runInsights(selected, previous);
  const comparable = selected
    ? data.runs
        .filter(
          (r) => r.startedAt < selected.startedAt && sameSelection(r, selected),
        )
        .slice(0, 9)
        .reverse()
        .concat(selected)
    : [];
  const runtime = [
    ["Java executable", data.runtime.java],
    ["Paper server JAR", data.runtime.paper],
    ["Skript plugin JAR", data.runtime.skript],
    ["EULA accepted", data.runtime.eula],
    ["Trusted workspace", data.trusted],
  ] as const;
  const configured = runtime.every(([, ready]) => ready);
  const timestamp = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Unknown date"
      : date.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${esc(resources.nonce)}'; script-src 'nonce-${esc(resources.nonce)}';"><title>SkTestLab</title><link nonce="${esc(resources.nonce)}" rel="stylesheet" href="${esc(resources.style)}"><script nonce="${esc(resources.nonce)}" defer src="${esc(resources.script)}"></script></head><body data-theme="${dashboardTheme(data.theme)}"><a class="skip-link" href="#results">Skip to test results</a><div class="app-shell">
  <aside class="rail"><a class="brand" href="#overview" aria-label="SkTestLab overview"><span class="brand-mark">${icon("lab")}</span><span>SkTest<span class="accent">Lab</span><small>SKRIPT DEVELOPMENT</small></span></a><div class="rail-label">WORKSPACE</div><div class="project-chip">${icon("code")}<span title="${esc(data.project)}">${esc(data.project)}</span></div><nav aria-label="Dashboard sections"><a class="nav-link active" href="#overview">${icon("spark")}Overview</a><a class="nav-link" href="#results">${icon("check")}Test results <span class="nav-count">${summary.total}</span></a><a class="nav-link" href="#history">${icon("clock")}Run history</a><a class="nav-link" href="#runtime">${icon("server")}Runtime setup</a></nav><div class="rail-bottom"><button class="text-button" data-action="docs">${icon("file")}Documentation</button><span class="local-label"><i></i>Local by design</span><small>v${esc(data.version)} · DHeaven</small></div></aside>
  <main id="overview"><header class="topbar"><span>WORKSPACE <span class="slash">/</span> <strong>Overview</strong></span><div class="topbar-actions"><label class="theme-picker"><span>Theme</span><select id="dashboard-theme" aria-label="Dashboard theme"><option value="auto">Follow VS Code</option><option value="white">White</option><option value="dark">Dark</option></select></label><span class="trust-tag">${data.trusted ? "Trusted workspace" : "Restricted mode"}</span><button class="icon-button" data-refresh aria-label="Refresh dashboard">${icon("refresh")}</button></div></header>
  <section class="hero"><div><span class="eyebrow"><span class="tiny-square"></span>YOUR SKRIPT WORKBENCH</span><h1>Make your next change.<br><span class="accent">Ship it with evidence.</span></h1><p>From a quick source check to a real Paper run. Keep the results, inspect every assertion, and see what changed.</p><div class="hero-actions">${button("runAll", data.progress ? "Run in progress" : "Run all tests", "play", true, !!data.progress || data.counts.total === 0)}${button("offline", "Offline only", "check", false, !!data.progress || data.counts.offline === 0)}${data.progress ? button("stop", "Stop run", "stop") : button("analyze", "Analyze workspace", "code")}</div></div><div class="hero-orbit" aria-hidden="true"><span class="orbit-ring ring-one"></span><span class="orbit-ring ring-two"></span><span class="orbit-core">${icon("lab")}</span><span class="orbit-tag">.sk → ✓</span><span class="orbit-point p1"></span><span class="orbit-point p2"></span></div></section>
  ${data.progress ? `<div class="run-progress" role="status" aria-live="polite"><span class="spinner"></span><strong>Running ${data.progress.completed} / ${data.progress.total}</strong><span>${esc(data.progress.label)}</span></div>` : ""}
  <section class="metrics" aria-label="Project and last-run metrics"><div class="metric"><div class="metric-label">Discovered tests ${icon("lab")}</div><strong>${data.counts.total}</strong><small>${data.counts.offline} offline <span>·</span> ${data.counts.runtime} runtime${data.counts.templates ? " · " + data.counts.templates + " templates" : ""}</small></div><div class="metric"><div class="metric-label">Passed ${icon("check")}</div><strong class="accent">${selected ? summary.passed : "—"}</strong><small>${selected ? "of " + summary.total + " selected tests" : "Run tests to see results"}</small></div><div class="metric"><div class="metric-label">Needs attention ${icon("alert")}</div><strong class="${summary.failed + summary.errored ? "danger" : "muted"}">${selected ? summary.failed + summary.errored : "—"}</strong><small>${selected ? summary.failed + " failed · " + summary.errored + " errored" : "No completed run yet"}</small></div><div class="metric"><div class="metric-label">Static findings ${icon("code")}</div><strong>${data.analysis.files ? data.analysis.errors + data.analysis.warnings : "—"}</strong><small>${data.analysis.files ? data.analysis.errors + " errors · " + data.analysis.warnings + " warnings · " + data.analysis.files + (data.analysis.files === 1 ? " file" : " files") : "Analyze workspace to see findings"}</small></div></section>
  <div class="content-grid"><div class="main-column"><section class="panel intelligence-panel" aria-label="Run insights"><div class="panel-heading"><div><span class="eyebrow">MEASURED, NOT ASSUMED</span><h2>Run insights</h2></div><span class="scope-pill">${selected ? "Selected run" : "Awaiting first run"}</span></div><div class="insight-grid"><div><span class="metric-label">Assertions passed</span><strong>${selected ? insights.passedAssertions + "<small> / " + insights.assertions + "</small>" : "—"}</strong></div><div><span class="metric-label">Test selection</span><strong>${insights.offline}<small> offline · </small>${insights.runtime}<small> runtime</small></strong></div><div><span class="metric-label">Slowest executed test</span><strong>${insights.slowest ? duration(insights.slowest.durationMs) : "—"}</strong><small class="truncate">${esc(insights.slowest?.name ?? "No execution recorded")}</small></div></div><div class="trend-heading"><span>Pass rate · same test selection</span><span>${comparable.length} recorded run${comparable.length === 1 ? "" : "s"}</span></div>${
    comparable.length
      ? `<div class="trend-chart" role="group" aria-label="Comparable run pass rates">${comparable
          .map((r) => {
            const c = summarize(r);
            return `<button class="trend-column ${r.id === selected?.id ? "selected" : ""}" data-select-run="${esc(r.id)}" title="${esc(timestamp(r.startedAt))}: ${c.passed}/${c.total} passed" aria-label="${esc(timestamp(r.startedAt))}: ${c.passed} of ${c.total} passed"><strong>${c.percent}%</strong><span class="trend-track"><span data-height="${c.percent}"></span></span><small>${esc(timestamp(r.startedAt))}</small></button>`;
          })
          .join("")}</div>`
      : `<p class="muted panel-empty">Run tests to build a history. Trends compare matching selections only.</p>`
  }<div class="insight-footer">${insights.durationDelta !== undefined ? `Duration ${insights.durationDelta > 0 ? "+" : insights.durationDelta < 0 ? "−" : ""}${duration(Math.abs(insights.durationDelta))} versus preceding matching selection.` : "Duration comparisons appear when consecutive runs select the same tests."}<span class="timing-note">Runtime timings include startup; versions may differ between runs.</span></div></section><section class="panel results-panel" id="results" tabindex="-1" aria-label="Test results"><div class="panel-heading"><div><span class="eyebrow">${data.selectedId ? "SELECTED RUN" : "LATEST COMPLETED RUN"}</span><h2>Test results ${selected ? `<span class="subtle-count">${summary.total}</span>` : ""}</h2></div><div class="heading-actions">${button("runFailed", "Rerun failed", "refresh", false, !!data.progress || !selected?.results.some((r) => ["failed", "errored"].includes(r.status)))}<button class="icon-button" data-action="export" ${!selected ? "disabled" : ""} aria-label="Export test report">${icon("download")}</button></div></div>
  ${selected ? `<div class="run-summary"><div class="outcome-bar" role="img" aria-label="${summary.passed} passed, ${summary.failed} failed, ${summary.errored} errored, ${summary.other} not passed">${(["passed", "failed", "errored", "other"] as const).map((key) => `<span class="segment ${key}" data-segment="${summary[key]}"></span>`).join("")}</div><div class="run-meta"><span><i class="legend-dot passed"></i>${summary.passed} passed</span><span><i class="legend-dot failed"></i>${summary.failed + summary.errored} issues</span><span>${summary.other} other</span><span class="push-right">${esc(timestamp(selected.startedAt))} · ${duration(selected.durationMs)}</span></div>${regressionCount ? `<p class="regression-note">${icon("alert")}${regressionCount} regression${regressionCount === 1 ? "" : "s"} since the preceding run</p>` : ""}</div><div class="result-tools"><div class="filter-tabs" role="group" aria-label="Filter test results"><button class="filter active" data-filter="all" aria-pressed="true">All <span>${summary.total}</span></button><button class="filter" data-filter="issues" aria-pressed="false">Issues <span>${summary.failed + summary.errored}</span></button><button class="filter" data-filter="passed" aria-pressed="false">Passed</button><button class="filter" data-filter="other" aria-pressed="false">Other</button></div><label class="search-box">${icon("search")}<span class="sr-only">Search tests</span><input type="search" id="search" placeholder="Find a test…" autocomplete="off"></label></div><div class="advanced-tools"><label>Execution <select id="mode-filter"><option value="all">All modes</option><option value="offline">Offline checks</option><option value="runtime">Runtime tests</option></select></label><label>Sort by <select id="result-sort"><option value="original">Run order</option><option value="slowest">Slowest first</option><option value="name">Test name</option><option value="issues">Issues first</option></select></label><button class="text-button" id="expand-results">Expand visible</button><button class="text-button" id="collapse-results">Collapse all</button></div><div class="test-list">${selected.results.map((r, i) => resultHtml(r, i, selected.id)).join("")}</div><p class="no-matches muted" id="no-matches" hidden>No tests match this filter.</p><div class="list-footer"><span id="visible-count" aria-live="polite">${summary.total} tests</span><span>${selected.results.some((r) => r.mode === "offline") ? "Offline checks verify static expectations." : "Runtime results come from Skript."}</span></div>` : `<div class="empty-state"><span class="empty-icon">${icon("lab")}</span><h3>Your next green check starts here.</h3><p>${data.counts.total ? "Your tests are discovered. Run the offline checks or launch a configured runtime test to see real results here." : "Open a .sk file, create a test from the command palette, then refresh discovery. No made-up results—just a clean start."}</p>${button("discover", "Discover tests", "refresh")}</div>`}</section>
  <section class="panel history-panel" id="history"><div class="panel-heading"><div><span class="eyebrow">THE RECENT PAST</span><h2>Run history</h2></div><span class="muted">${data.runs.length} saved in this workspace</span></div>${
    data.runs.length
      ? `<div class="history-list">${data.runs
          .slice(0, 8)
          .map((run) => {
            const count = summarize(run);
            return `<button class="history-row ${run.id === selected?.id ? "selected" : ""}" data-select-run="${esc(run.id)}" aria-pressed="${run.id === selected?.id}"><span class="history-icon ${count.failed + count.errored ? "attention" : "good"}">${icon(count.failed + count.errored ? "alert" : "clock")}</span><span><strong>${esc(timestamp(run.startedAt))}</strong><small>${count.total} test${count.total === 1 ? "" : "s"} · ${duration(run.durationMs)}</small></span><span class="history-outcome"><b>${count.passed} passed</b><small>${count.failed + count.errored} issues · ${count.other} other</small></span>${icon("arrow")}</button>`;
          })
          .join("")}</div>`
      : '<p class="panel-empty muted">Completed runs will appear here. History is stored locally.</p>'
  }</section></div>
  <aside class="side-column"><section class="panel runtime-panel" id="runtime"><div class="panel-heading"><div><span class="eyebrow">ISOLATED PAPER</span><h2>Runtime setup</h2></div>${icon("server")}</div><div class="runtime-banner ${configured ? "configured" : ""}"><i></i>${configured ? "Configuration selected" : "Setup needs attention"}</div><p class="side-description">${configured ? "Your runtime settings are selected. A real test confirms server compatibility." : "Offline checks are available now. Add your local server files when you need real Skript execution."}</p><ul class="checklist">${runtime.map(([label, ready]) => `<li><span class="setup-check ${ready ? "yes" : ""}">${ready ? icon("check") : "·"}</span>${label}<span class="setup-state">${ready ? "Set" : "Needed"}</span></li>`).join("")}</ul>${button("configure", configured ? "Configure runtime" : "Set up runtime", "server")}${configured ? '<button class="text-button validate" data-action="validate">Validate environment ' + icon("arrow") + "</button>" : ""}<div class="safety-note">Minecraft 1.21+ · matching Skript release.<br>Fresh environment. Loopback only.<br>Your production world stays separate.</div></section>
  <section class="panel quick-panel"><span class="eyebrow">KEEP THE FLOW</span><h2>Useful shortcuts</h2><button class="quick-link" data-action="recovery">${icon("server")}Recover environments${icon("arrow")}</button><button class="quick-link" data-action="createTest">${icon("lab")}Create a test${icon("arrow")}</button><button class="quick-link" data-action="discover">${icon("refresh")}Refresh discovery${icon("arrow")}</button><button class="quick-link" data-action="logs">${icon("code")}Open test logs${icon("arrow")}</button><button class="quick-link" data-action="docs">${icon("file")}Testing guide${icon("arrow")}</button></section><div class="confidence-note">${icon("spark")}<p><strong>Know what a green check means.</strong> Static checks and real runtime execution stay clearly separated. Skipped tests never count as passed.</p></div>${data.counts.invalid ? `<p class="regression-note">${data.counts.invalid} invalid test definition${data.counts.invalid === 1 ? "" : "s"} — inspect Test Explorer.</p>` : ""}</aside></div>
  <footer><span><i class="tiny-square"></i>SKTESTLAB <span class="muted">/ Write. Test. Debug. Perfect.</span></span><span>No cloud. No telemetry. Just your work.</span></footer><div class="sr-only" id="action-status" role="status" aria-live="polite"></div></main></div></body></html>`;
}
