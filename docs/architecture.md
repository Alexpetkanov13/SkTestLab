# Architecture and implementation plan

Eight checkpoints: foundation; analysis; deterministic tests; optional runtime; templates/navigation; history/reports; trust/fault handling; packaging. Real runtime checks pass on the recorded combination; broader certification remains outstanding.

- `src/core`: VS Code-independent scanner, typed source nodes/symbols, structural diagnostics, bounded revision cache and cross-file declaration comparison.
- `src/testing`: definition validation, deep assertions, sequential coordinator and atomic local history.
- `src/providers`: OfflineProvider checks static fixtures; PaperProvider owns process execution through the same capability-declaring contract.
- `src/runtime`: Java/JAR validation, owned environment preparation, generated harness and marker protocol.
- `src/security`: relative-path policy, realpath checks, terminal sanitation and escaping.
- `src/extension`: native settings, diagnostics, actions, lenses, templates, discovery and TestRun updates.
- `src/ui`, `src/reports`: pure dashboard model/renderer, nonce-protected local webview client, native activity-bar overview and JSON/HTML/JUnit rendering.
- `src/cli`: offline CI adapter.

Providers accept AbortSignal and must release resources before resolving. Sequential scheduling avoids shared-state assumptions. No Debug/Coverage profiles exist without corresponding implementations.

Parsing preserves raw source, whitespace, token spans and section hierarchy. Unknown constructs have heuristic confidence. Parent links make the internal tree cyclic; it is not directly serialized. Revision caching reanalyzes an edited document, not individual subtrees. Cross-file collision checks omit local functions from global scope.

Discovery creates workspace → folder → file → test hierarchy. Each definition is one test with assertions. Watchers refresh definitions; current discovery rescans rather than loading folders lazily. Related-test selection uses explicit target membership. Workspace analysis batches publication rather than publishing every intermediate file. History retains at most 50 atomic JSON run records in extension global storage.

SkriptLogDiagnostics pairs multiline source headers/details. Known warnings are retained; errors/unclassified messages block success. Generated project-N.sk names map back to original targets. Last-run runtime diagnostics are published separately from static findings.

Native unsupported/not-executed/cancelled map to skipped with explanatory output; JSON keeps exact states. Dashboard regressions compare latest results to the previous saved run by source path and ID.

The dashboard controller owns one reusable webview, subscribes to discovery/progress/configuration events and disposes its listeners. Its client retains filters/search through VS Code webview state. History is scoped to current workspace paths. Historical reruns match current definitions by file/ID, and exports honor the selected run. The host validates every message and source navigation target rather than accepting arbitrary command/path payloads.
