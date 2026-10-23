# Troubleshooting

**No tests:** Open a filesystem folder, save a `.sktest.json` matching tests.include, then Discover Tests. File-item errors and Test Logs explain malformed definitions. A test needs targets and assertions.

**Missing target:** Paths resolve from the workspace root, not the definition directory. Use forward slashes. Absolute paths and symlink escapes are rejected. List all function dependencies.

**Template not running:** Add real actions/conditions and remove template: true. Until then, not-executed is intentional.

**Runtime timeout:** Cold Paper startup may download dependencies/create worlds. Use timeoutMs: 300000. Check Java on the extension host and upstream JAR compatibility.

**Java missing in WSL/SSH:** Configure/install Java on that host. Windows paths do not work in remote Linux.

**No completion marker:** Missing addons, invalid syntax, inaccessible local functions or early stop may prevent completion. Retain the environment and inspect project-N.sk/zz-sktestlab.sk. A missing marker is always an error.

**Server still closing:** Cancellation allows ten seconds for stop, then kills its Java process. Plugins can launch independent processes beyond extension lifecycle control.

**Unexpected findings:** Review confidence/rule explanations and disable unsuitable heuristics. Unknown syntax is not statically certified.

**Stale cross-file diagnostic:** Analyze Workspace updates documents. External source deletion tracking is limited; reload to reset all indexes. Test definitions have create/change/delete watchers.

**Report write fails:** Choose an accessible local path and trust the workspace. Escaping outputDirectory values are rejected. History stays in extension global storage and is not uploaded.

**No highlighting:** Use your preferred Skript language extension; SkTestLab intentionally supplies no competing grammar.
