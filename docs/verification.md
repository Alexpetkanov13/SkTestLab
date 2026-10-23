# Verification record

2026-10-23 · Windows · Node 24.21.0 · npm 11.19.0 · VS Code 1.143.1.

## Automated extension checks

139 unit/security/performance/compatibility tests cover analysis, Quick Fix regressions, runtime logs, process faults, trust, cache isolation, history validation, dashboard models/message security, escaping and reports. Six standard extension-host checks passed against the installed 0.2.0 VSIX and cover activation/commands, discovery, diagnostics/Quick Fix availability, normal and offline-only runs, and actual webview JavaScript loading under its CSP with panel reuse.

Version 0.1.2 was visually checked in wide/narrow dark and light layouts using genuine recorded ChickFarm results. Browser checks exercised status filters, search, history selection, empty states and action messages. The native webview's ready event confirms its packaged client executes; no arbitrary remote JavaScript or command URIs are enabled.

The real-project suite passes five checks: native discovery, workspace analysis, 44 offline snapshot tests, missing-runtime preflight and actual Paper error reporting at original source locations. All 87 original ChickFarm input hashes were unchanged. See [project results](chickfarm-verification.md).

## Actual Paper execution

Java 21.0.12 / Paper 1.21.11-132 / Skript 2.16.0. Additional project runs used SkCine 1.0.1. JARs and immutable dependency caches came from the owner-provided server; its accepted EULA was verified. Original worlds/plugin data were not copied or modified.

| Scenario                                     | Actual result                    | Expected  |
| -------------------------------------------- | -------------------------------- | --------- |
| Project purchase function                    | passed                           | passed    |
| Deliberately incorrect balance               | failed                           | failed    |
| Invalid script                               | errored; assertions not executed | errored   |
| Recognized warning-only script               | passed with warning              | passed    |
| Cancel during startup                        | cancelled                        | cancelled |
| Unmodified ChickFarm spawn.sk                | loaded; assertion passed         | passed    |
| ChickFarm credits.sk with unavailable syntax | errored at lines 60/71           | errored   |

The canonical five-case runtime suite finished with zero remaining environment directories. Native integration confirmed mapped Problems diagnostics. Evidence stays local under .vscode-test/runtime-real-* and .vscode-test/project-smoke-*; it is not bundled/uploaded automatically.

## Packaging and remaining gates

Source/tests/node_modules are excluded from the VSIX; bundle, manifest, icon, schema, snippets and documentation are included. Installation is checked with isolated extension/profile directories. npm audit reports zero vulnerabilities. The 10,000-line benchmark has a five-second ceiling; native project analysis measured approximately 1.2 seconds after batching.

Unverified: Linux/macOS UX, broader runtime/addon/localization combinations and extended crash recovery. Minimum editor and Restricted Mode checks were subsequently completed below. No publication occurred.

## Release 0.2.0 verification — 2026-10-23

The local version matrix ran the same seven Reward Lab assertions without addons:

| Paper             | Skript | Java    | Result     |
| ----------------- | ------ | ------- | ---------- |
| 1.21 build 130    | 2.9.0  | 21.0.12 | 7/7 passed |
| 1.21.11 build 132 | 2.14.0 | 21.0.12 | 7/7 passed |
| 1.21.11 build 132 | 2.16.0 | 21.0.12 | 7/7 passed |

All three results retained matching observed versions. Local evidence: `.vscode-test/matrix-lwaxpl/results.json` includes JAR hashes, logs and assertion results. The Paper 1.21 JAR hash matched the official download API's SHA-256. This sample verifies the shared harness across these releases; other Minecraft patches, Skript releases, future 26.x releases, addons and localized logs still require their own matrix runs.

Dashboard controls were exercised in a browser: mode filtering, sorting, expand/collapse and failure evidence. Native VS Code integration separately confirmed webview asset loading under nonce CSP and panel reuse. See [compatibility](compatibility.md) to reproduce a larger matrix.

The five canonical runtime scenarios were repeated for 0.2.0 with every expected classification and zero remaining environments. Evidence: `.vscode-test/runtime-real-53vFPx/results.json`. Formatting, TypeScript, lint, all 139 unit tests and dependency audit passed (zero vulnerabilities).

## Release 0.2.1 readiness checks — 2026-10-23

- VS Code **1.96.0**, the declared minimum, passed real activation/command registration, discovery, diagnostics, offline execution, live dashboard ready/CSP and panel-reuse checks. Evidence: `.vscode-test/editor-check-jue9LM/evidence.json`.
- VS Code **1.143.1** in actual **Restricted Mode** reported `workspace.isTrusted=false`, allowed analysis and offline checks, and blocked runtime and initialization. Evidence: `.vscode-test/editor-check-2BFsBW/evidence.json`.
- The Restricted Mode launcher bypasses test-electron's default `--disable-workspace-trust` flag; it uses the official downloaded editor executable with a fresh profile. A mocked trust flag is not substituted for native verification.
- Standard integration still passes all six checks; all 139 unit checks pass. CI now includes minimum/trust checks, but Linux/macOS CI has not been executed locally.
- Owner selected MIT. The release preparer verifies the built VSIX license/version, includes source and a portable example, excludes local editor/EULA settings, and checks every delivered file hash after writing the ZIP.

## Release 0.3.0 runtime recovery — 2026-10-23

The new real reliability suite used the owner's supplied Paper 1.21.11 / Skript 2.16.0 server files and Java 21, with SkCine configured. Two cancellations during delayed actions returned cancelled; a 60-second test deadline returned errored with `Test timed out`. Its log confirms BEGIN before the deadline, so this exercised actions rather than just slow startup. Both cancellation cases and the timeout left no environment directories.

The crash scenario terminated a separate disposable Node owner after the harness began. Its environment was active/protected beforehand. On this Windows setup Java also exited when the owner was terminated; subsequent inspection classified the directory recoverable and removed it. This run does not establish that a Java process survives an editor crash on every platform. Live-PID protection and uncertain-launch preservation are covered separately in the recovery tests.

Evidence: `.vscode-test/reliability-real-Oh81k9/results.json` and adjacent logs. No original scripts/server worlds were changed. The suite's crash teardown can terminate only its newly created disposable server; the product's recovery command never kills a PID.

157 unit/security/process tests pass. Native six-case integration, minimum VS Code 1.96.0 (`editor-check-rxqTMI`) and actual Restricted Mode (`editor-check-ssPMIE`) also passed. Additional tests cover bounded unconfirmed shutdown, stop escalation, cancellation during the startup-ready callback, output-consumer faults, ownership changes, dead/live PIDs, host mismatches and outside-directory links.

The canonical five real-server scenarios were repeated with lifecycle tracking, all with expected classifications and zero remaining environments (`.vscode-test/runtime-real-eDGF3u/results.json`). The installed 0.3.0 VSIX separately passed all six current-editor integration checks.

## Release 0.3.1 distribution and accessibility — 2026-10-23

Windows x64 is the owner-selected initial release scope. Release packaging now declares `win32-x64` in the VSIX Identity, and the download preparer rejects a missing/different target. Other operating systems and architectures are not release-certified. Only the previously recorded three Minecraft/Skript pairings are advertised as tested.

The distribution runner verifies/extracts the actual download ZIP and installs its VSIX in a clean profile. The product is loaded from that profile's installed extensions directory; a separate test driver runs acceptance checks. Fresh acceptance passed the portable offline test and all seven real Paper assertions, generated a deliberate offline failure, checked its dashboard expected/received evidence, exported a failing JUnit report through the installed CLI, switched four actual native themes and uninstalled. All portable input hashes were preserved and no runtime directories remained. Runtime settings were explicitly provisioned from the owner's accepted local test configuration; this does not replace an external user's walkthrough of the setup dialogs.

Local initial evidence: `.vscode-test/distribution-CFAFLl/evidence.json` (fresh/runtime), `.vscode-test/distribution-aKEPU9/evidence.json` (0.2.1 upgrade, history and uninstall). These first checks used the universal candidate before narrowing the package target; the Windows-target bundle receives a subsequent acceptance run.

The Windows x64-targeted bundle subsequently passed upgrade from 0.2.1, optional runtime (7/7 assertions), failure export, native theme switching and uninstall/hash preservation: `.vscode-test/distribution-d6cBqe/evidence.json`. The target-aware preparer verified the VSIX platform manifest and all delivered checksums. All 157 unit checks, six current native integration checks, type/lint/format and dependency audit also passed; no test Java processes remained.

Browser checks used the actual recorded results with packaged HTML/CSS/JavaScript: dark/light/high-contrast/high-contrast-light at a 1280-pixel viewport, plus an embedded 360-pixel dashboard viewport. Keyboard checks covered the skip link, `/` search, Escape clearing, Enter on the issue filter and Enter on a failure summary. Fixed the high-contrast light palette to use the light accent; `#10735c` measures 5.79:1 against white. High-contrast panels use solid backgrounds. This is targeted accessibility verification, not a full screen-reader/WCAG audit.

Native Save dialogs and an independent fresh-user review remain final-release acceptance items. No beta-user feedback, public hosting or skUnity submission is implied by these automated checks.

## Release 0.4.0 dashboard appearance — 2026-10-23

Added explicit white/dark/automatic appearance persisted through extension profile global state. The native integration suite now has seven checks, including saving white appearance, closing/reopening the panel, switching to dark and restoring automatic appearance. Theme messages accept only the three enum strings; malformed values are rejected.

Browser checks verified white appearance against a dark host (`rgb(255,255,255)` background), persistence through reload, and dark appearance against a light host (`rgb(20,25,32)` background). Select controls used the matching independent palette. White/dark screenshots are in docs/images/dashboard-white.png and dashboard-dark.png. The preview uses a local persistence bridge; the native integration check separately exercises actual VS Code global state.

Independent beta instructions and a feedback issue template are prepared. This does not count as outside feedback; no testers were contacted and no files were uploaded.

The installed Windows x64 0.4.0 VSIX passed all seven native integration checks, including appearance persistence. All 158 unit checks, type/lint/format checks passed. Distribution acceptance upgraded 0.3.1 to 0.4.0, preserved saved run IDs and project hashes, exported a failed JUnit report and uninstalled successfully (`.vscode-test/distribution-2jl5sm/evidence.json`). This UI-only release did not repeat the unchanged real Paper provider tests; prior runtime evidence remains recorded above.

## Release 0.4.1 source/publication preparation — 2026-10-23

The owner supplied the public `Alexpetkanov13/SkTestLab` repository. It was empty at initial inspection, with Issues enabled. Repository/homepage/support metadata now points there; MIT remains the owner-selected license.

A clean rebuild of the actual 0.4.0 source ZIP installed its locked dependencies in a newly extracted directory, passed type/lint and all 158 unit checks, and reproduced extension.js, cli.js and both source maps byte-for-byte against the shipped VSIX (`.vscode-test/source-release-oC8Aox/evidence.json`). This is separate from building the original working tree.

The nested release audit checked 183 entries in the 0.4.0 download with no findings for its implemented checksum/path/credential/profile/build-artifact patterns. Six synthetic audit regressions cover tampering, secret-value suppression, nested local settings, personal profile paths, server JARs and path traversal. A clean-source check and audit will also run on the 0.4.1 candidate. Pattern auditing does not establish the absence of every possible secret.

## Release 0.5.0 dashboard redesign — 2026-10-23

Replaced decorative hero artwork with a measured selected-run snapshot, placed test results before analytics in DOM order, and added a five-step settings indicator for runtime readiness. Snapshots distinguish failed, incomplete and fully passed selections; an empty selection displays no percentage. White/Dark palettes, cards, navigation, result controls and narrow-screen layouts were refined. Follow VS Code, reduced motion and high contrast behavior remain available.

Type, lint and format checks and all 159 unit tests passed. The native VS Code suite passed all seven checks, including the actual webview CSP and profile-persistent appearance. Browser checks exercised issue filtering, execution-mode empty matches, searching and expanding/collapsing visible assertions. Reviewed White/Dark, empty history and a 390px iframe layout. Desktop DOM measurement confirmed no horizontal overflow and results preceding insights. Browser previews use recorded Reward Lab acceptance results, including an intentional failure, and a local theme-persistence bridge; they are not new Minecraft runs. Updated White/Dark screenshots show this candidate.

The Minecraft provider did not change, so the real-server version matrix was not repeated for this UI change. Independent beta feedback and final native setup/report-saving dialogs remain release gates. A 0.5.0 candidate package is prepared separately from public GitHub source and release assets.

## Release 1.0.0 acceptance — 2026-10-23

The owner waived independent beta feedback as a release requirement; no external reports are claimed. Initial support remains Windows x64, MIT, VS Code 1.96+, with only the three recorded Paper/Skript pairings certified by local evidence.

All 159 unit checks and type/lint/format checks passed. The installed 1.0.0 candidate passed seven native extension checks, VS Code 1.96.0 (`editor-check-8LjG63`), and actual Restricted Mode (`editor-check-M9gP2v`). Restriction kept runtime and initialization blocked while permitting offline checks. Real Paper canonical tests produced all five expected outcomes (`runtime-real-CVhZDd`): pass, assertion failure, parser error, warning-only pass and startup cancellation. All three matrix pairings passed seven reward assertions each (`matrix-bTPqX4`). Repeated action cancellation, timeout and abrupt owner exit/recovery passed (`reliability-real-pqM0Xo`); no SkTestLab Java processes remained afterward. The provider was unchanged by the final report-export fix.

The installed candidate upgraded 0.2.1 to 1.0.0 with history preserved, ran portable offline and real Paper tests, exported an intentional failed CLI JUnit report, switched four native themes, uninstalled and preserved original project file hashes (`distribution-HWs7cK`).

An isolated editor walkthrough selected the actual Paper and Skript files and retained the Java path. The Minecraft EULA prompt was cancelled; existing acceptance from the owner's test server was reused for runtime tests, and no new agreement was accepted by the agent. A real JSON Save As export was opened and its contents verified. This found a missing-parent-directory issue that caused Windows to reuse an unrelated previous folder. Export now creates the configured report directory before opening Save As. The fixed VSIX was reinstalled; the actual dialog opened in that workspace's .sktestlab/reports folder and saved a valid report there. Original editor/scripts/server files were not modified. Local screenshots/paths used for UI evidence are kept out of the public package.

Final source review also corrected three dependency version metadata entries without changing their resolved tarballs and restored the complete testing reference alongside the optional walkthrough. Nine release-audit regression tests now include locked dependency/root-version consistency. Final documentation and publication artifacts are frozen after these checks. Clean-source reproduction, archive audits, final bundle installation and anonymous release-asset verification are recorded with the release run. The owner remains responsible for previewing/submitting the skUnity resource; staff approval is independent.
