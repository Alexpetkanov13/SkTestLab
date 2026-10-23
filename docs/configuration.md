# Configuration

Dashboard appearance: use **Theme** at the top-right of the dashboard to select **White**, **Dark** or **Follow VS Code**. The choice is saved locally in the current VS Code profile and applies when reopening the panel. It does not change the editor theme, project settings or runtime configuration. Follow VS Code is the default and preserves automatic high-contrast theme behavior.

New in 0.1.2: `sktestlab.ui.openDashboardOnStartup` optionally opens the dashboard after activation. Default: false. The dashboard also has direct offline-only, analysis and testing actions.

New in 0.1.1: `sktestlab.runtime.dependencyCachePath` is an optional absolute existing server directory. Only cache, libraries and versions are copied. Worlds, plugin data and configuration are excluded.

Runtime paths are machine-overridable; prefer global machine settings to committing paths. Executable overrides require Workspace Trust.

| Setting                                  | Default                                | Purpose                                                                                 |
| ---------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| sktestlab.enabled                        | true                                   | Enable SkTestLab.                                                                       |
| sktestlab.analysis.enabled               | true                                   | Publish structural and heuristic Skript findings.                                       |
| sktestlab.analysis.debounceMs            | 300                                    | Analysis delay after editing (milliseconds).                                            |
| sktestlab.analysis.disabledRules         | []                                     | Diagnostic IDs to suppress.                                                             |
| sktestlab.analysis.maxDepth              | 6                                      | Warn above this nesting depth.                                                          |
| sktestlab.analysis.maxFileSizeKb         | 1024                                   | Skip larger source files.                                                               |
| sktestlab.tests.include                  | "**/*.sktest.json"                     | Test discovery glob.                                                                    |
| sktestlab.tests.exclude                  | "**/{node_modules,.git,.sktestlab}/**" | Excluded test paths.                                                                    |
| sktestlab.tests.timeoutMs                | 30000                                  | Per-test timeout, including runtime startup. Raise this for cold Paper startup.         |
| sktestlab.runtime.javaPath               | "java"                                 | Java executable on the extension host.                                                  |
| sktestlab.runtime.paperJarPath           | ""                                     | Absolute path to a user-selected Paper JAR.                                             |
| sktestlab.runtime.skriptJarPath          | ""                                     | Absolute path to a user-selected Skript JAR.                                            |
| sktestlab.runtime.addonJarPaths          | []                                     | Absolute paths to user-selected addon JARs.                                             |
| sktestlab.runtime.memoryMb               | 2048                                   | Maximum Java heap (MiB).                                                                |
| sktestlab.runtime.startupTimeoutMs       | 180000                                 | Maximum Paper startup duration.                                                         |
| sktestlab.runtime.keepEnvironment        | false                                  | Keep owned test environment directories for inspection.                                 |
| sktestlab.runtime.eulaAccepted           | false                                  | You have read and accepted https://www.minecraft.net/eula for the isolated test server. |
| sktestlab.compatibility.minecraftVersion | ""                                     | Expected Minecraft version (informational; runtime uses the selected JAR).              |
| sktestlab.compatibility.skriptVersion    | ""                                     | Skript version for version-aware diagnostics. Empty means unknown.                      |
| sktestlab.reports.outputDirectory        | ".sktestlab/reports"                   | Suggested project-relative export directory.                                            |
| sktestlab.reports.defaultFormat          | "json"                                 | Default report format.                                                                  |
| sktestlab.ui.showCodeLens                | true                                   | Show test generation and related test actions.                                          |
| sktestlab.logging.level                  | "info"                                 | Output detail level.                                                                    |

Configuration changes invalidate analysis caches. Targets resolve from their owning workspace. Minecraft version is informational; Skript version enables the limited compatibility rule. Empty means unknown. Addon catalogs and parallel scheduling are deferred.
