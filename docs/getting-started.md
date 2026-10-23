# Getting started

Install sktestlab-0.1.2.vsix through Extensions or the code CLI. VS Code Desktop 1.96 or later is declared; current stable is tested locally. WSL/SSH use the remote host's filesystem and Java. Virtual/browser workspaces are unsupported.

Open a folder with `.sk` files. Existing language extensions continue highlighting; SkTestLab matches file paths without registering a competing grammar.

Analyze Current File publishes Problems findings. Structural/heuristic labels explain confidence. Choose supported Quick Fixes with Ctrl+. Analyze Workspace indexes declarations across local files. Cross-file collisions are heuristic because loading order is not inferred.

Create Test on a `.sk` editor. Structure regression captures current diagnostic count and declarations. Review expectations: existing errors can be captured intentionally. Function/command choices produce incomplete runtime templates; `template: true` prevents execution until you supply meaningful actions and expectations.

In Testing, refresh and press Run. Failures show expected/actual diffs. Unsupported, cancelled and incomplete tests use native skipped state with precise classifications in output/reports, never passes.

Open the repository root to run `examples/beginner/script.sktest.json`. Copying examples elsewhere requires adjusting target paths.

Click the beaker in the activity bar and choose Open dashboard. It shows actual run counts, static findings, runtime configuration and recent history. Filter results by status, search names/paths, and expand a test to inspect assertion differences or runtime messages. Open source navigates beside the dashboard. Selecting a historical run changes the displayed results and export/rerun selection.

Offline only runs static tests without starting Java. Run all tests also includes runtime definitions. Skipped and incomplete tests stay distinct from passes. Live progress and a Stop button appear during execution. Optional ui.openDashboardOnStartup opens this view when the extension activates; it defaults to false.

Open Test Logs shows runtime output. Export Test Report supports JSON, HTML and JUnit.

Restricted Mode permits analysis and offline checks. File creation, Java execution, runtime configuration, report writes and history deletion require trust. No script launches automatically on open/save.
