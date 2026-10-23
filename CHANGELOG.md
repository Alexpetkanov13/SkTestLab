# Changelog

## 1.0.0 — 2026-10-23

- Initial scoped Windows x64 release under MIT, with source and a portable Reward Lab example.
- Native VS Code diagnostics and Quick Fixes, Test Explorer, offline assertions and isolated Paper/Skript runtime tests.
- Saved run history, reruns, runtime recovery, JSON/HTML/JUnit exports, and a White/Dark/Follow VS Code dashboard with assertion and version evidence.
- Minecraft 1.21+ is the compatibility target with a matching Skript release; only recorded matrix pairings are advertised as verified. Other platforms, arbitrary addon support, player simulation, debugger and coverage are outside this release.
- Fixed first-use report export opening an unrelated previous folder: create the configured report directory before showing Save As.
- Added a release-audit check for dependency lock metadata that disagrees with its registry tarball version.
- Final checks are recorded in docs/verification.md.

## 0.5.0 — 2026-10-23

- Redesigned the dashboard with a measured run snapshot, results before analytics, clearer runtime readiness, and more readable result controls.
- Refined White and Dark palettes, navigation, typography, cards, and narrow layouts while retaining Follow VS Code and high contrast support.
- Pass-rate snapshots distinguish incomplete execution from a fully passing run; empty histories do not display an invented percentage.

## 0.4.1 — 2026-10-23

- Configure the owner-provided public repository, homepage and GitHub Issues support metadata.
- Add nested-archive/checksum publication audit and six synthetic audit regressions.
- Add clean-source install/check/lint/test/build verification with byte comparisons against VSIX JavaScript and source maps.
- Add hosting handoff, independent beta status and an empty feedback tracker; retain MIT contribution terms.
- Exclude local editor settings, environment files, server JARs and transient logs from Git staging.

## 0.4.0 — 2026-10-23

- Added explicit White, Dark and Follow VS Code dashboard appearance choices.
- Persist appearance locally in the current VS Code profile across panel closure, without changing editor settings or project files.
- Added independent control/background/focus palettes so either appearance works with the opposite editor theme.
- Validate theme messages and preserve high-contrast borders in supported editor themes.
- Added independent beta acceptance instructions and feedback template; include BETA-TESTING.md in the download.

## 0.3.1 — 2026-10-23

- Confirmed Windows-first release scope and target the packaged extension to Windows x64.
- Added distribution acceptance against the actual ZIP/installed extension: fresh install, runtime example, failure/JUnit report, upgrade history and uninstall/file preservation.
- Fixed high-contrast light accent colors and added keyboard skip navigation to test results.
- Verified dark/light/high-contrast theme switches and browser keyboard controls, with native and portable package evidence.
- Added portable extraction/checksum verification and a Windows package-workflow acceptance step.

## 0.3.0 — 2026-10-23

- Added explicit Runtime Environment Recovery command and dashboard shortcut, with lifecycle/PID ownership evidence and conservative handling of live, legacy and interrupted-launch environments.
- Revalidate and claim inactive directories before recovery; never kill a PID through recovery.
- Record process closure before normal cleanup and preserve environments when closure is uncertain.
- Prevent harness dispatch when cancellation arrives in the startup-ready callback.
- Contain output-consumer failures and verify stop escalation still waits for process closure.
- Added real repeated action cancellation, action timeout and owner-process-crash recovery checks.

## 0.2.1 — 2026-10-23

- Adopted MIT open-source licensing at the owner's request.
- Added reproducible minimum VS Code 1.96.0 and actual Restricted Mode checks, with CI steps for each claimed operating system.
- Verified analysis/offline execution in Restricted Mode while runtime and initialization remain blocked.
- Added portable example/source/download ZIP packaging with SHA-256 verification; exclude local editor/EULA settings and all server JARs.
- Added installation/troubleshooting guide, skUnity listing draft and explicit 1.0 acceptance gates.

Release preparation stays local; no upload or publication is performed.

## 0.2.0 — 2026-10-23

- Target Paper Minecraft 1.21+ without patch or Skript version whitelists, including year-based Minecraft versions; require an upstream-compatible pairing.
- Detect actual Minecraft/Skript/Java startup versions and retain evidence in runtime results and history; flag unknown/prerelease evidence in the dashboard.
- Reject Java below 21 and observed Minecraft below 1.21 with actionable messages.
- Add a reproducible local version-matrix runner with JAR hashes and per-combination results.
- Add dashboard insights, comparable-selection pass-rate history, assertion totals and slowest-test timing.
- Add execution-mode filters, duration/name/issue sorting, expand/collapse controls and search keyboard shortcut.
- Display all recorded assertions and observed runtime versions, retaining nonce CSP, message validation and workspace-scoped history.
- Include a standalone Reward Lab example with seven behavior assertions.

This remains a pre-1.0 release: untested upstream combinations and future releases are not universally certified.

## 0.1.2 — 2026-10-23

- Redesigned dashboard with mint branding, responsive dark/light layouts, live progress, result search/filters, assertion details and runtime checklist.
- Added activity-bar overview, offline-only command and live test counts in the status bar.
- Added workspace-scoped history, selected-run exports/reruns and source navigation beside the dashboard.
- Reused dashboard panels and preserved filter/search state across updates.
- Hardened history validation and dashboard messages; enabled only nonce-protected local client assets.
- Repeated ChickFarm/native integration and all five real Paper runtime scenarios.

## 0.1.1 — 2026-10-23

- Verified real Paper/Skript passing, failing, parse-error, warning-only and startup-cancellation cases.
- Fixed false colon fixes on loop-value calls, addon return-type metadata and numeric-loop ambiguity.
- Fixed missed multiline runtime errors; fail fast on parse errors and map diagnostics to original sources.
- Added source diagnostics to native Problems/Test Explorer and reports.
- Batched workspace publishing and added read-only project snapshot verification.
- Added safe dependency cache reuse, disabled generated bStats settings and a manual runtime workflow.

## 0.1.0 — 2026-10-23

Initial preview: diagnostics, native testing, offline assertions, isolated Paper implementation, templates, local history and portable reports. Actual Paper/Skript verification remains outstanding. See docs/verification.md and docs/roadmap.md.
