# Minecraft and Skript compatibility

The initial supported desktop platform is **Windows x64**. Release VSIX files target `win32-x64`. The exact pairings below are verified combinations; accepting other versions does not certify them. Linux, macOS, Windows ARM64 and 26.x runtime combinations remain unverified for release support.

SkTestLab 1.0.0 targets Paper for Minecraft **1.21 and newer**, including year-based releases such as 26.x. It accepts user-selected Skript JARs without restricting a release number. The selected Skript release and addons must themselves support the selected Paper version. Future releases remain subject to upstream behavior and local verification.

There is no universal Minecraft/Skript pairing. [Skript 2.9.0](https://github.com/SkriptLang/Skript/releases/tag/2.9.0) introduced Minecraft 1.21 support. [Skript 2.14.0](https://github.com/SkriptLang/Skript/releases/tag/2.14.0) lists 1.21.0–1.21.11. Newer Skript releases can drop older Minecraft patches; check each release's [official support range](https://github.com/SkriptLang/Skript/releases). Use the Java version required by [your Paper release](https://docs.papermc.io/paper/getting-started/); Java 21 is the minimum baseline, not a promise that every newer server runs on Java 21.

## Verified Skript 2.9–2.17 coverage

The Windows runtime harness has been exercised against one release in every minor line from **2.9 through 2.17**, plus the 2.17.1 patch. Each exact combination below passed seven assertions invoking the same real Reward Lab function. All used Java 21.0.12. The expanded checks ran on 2026-10-23.

| Skript release | Paper / Minecraft | Reward assertions |
| -------------- | ----------------- | ----------------- |
| 2.9.0          | 1.21 build 130    | 7 / 7 passed      |
| 2.10.0         | 1.21.4 build 232  | 7 / 7 passed      |
| 2.11.0         | 1.21.4 build 232  | 7 / 7 passed      |
| 2.12.0         | 1.21.4 build 232  | 7 / 7 passed      |
| 2.13.0         | 1.21.4 build 232  | 7 / 7 passed      |
| 2.14.0         | 1.21.11 build 132 | 7 / 7 passed      |
| 2.15.0         | 1.21.11 build 132 | 7 / 7 passed      |
| 2.16.0         | 1.21.11 build 132 | 7 / 7 passed      |
| 2.17.0         | 1.21.11 build 132 | 7 / 7 passed      |
| 2.17.1         | 1.21.11 build 132 | 7 / 7 passed      |

For the skUnity minor-version checkboxes, select **2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16 and 2.17**. These labels represent the tested minor lines, not every patch or every Minecraft pairing. Skript releases below 2.9 do not meet this tool's Minecraft 1.21+ scope. Addons and other pairings require their own checks.

Skript [2.10.0](https://github.com/SkriptLang/Skript/releases/tag/2.10.0) lists Minecraft 1.21.3/1.21.4 support, while [2.17.0](https://github.com/SkriptLang/Skript/releases/tag/2.17.0) and [2.17.1](https://github.com/SkriptLang/Skript/releases/tag/2.17.1) target Paper 1.21.5–26.3. Use an upstream-compatible pairing rather than putting every Skript version on one server version. The table intentionally uses different Paper patches.

The 2.17.0 lifecycle suite also verified a passing test, an intentional assertion failure, a script parse error, a warning-only script and startup cancellation, with all expected outcomes and no remaining runtime environments. Machine-readable [sanitized evidence](compatibility-matrix.json) contains observed versions, JAR hashes, run IDs and assertion counts; local paths and full logs are not included. The matrix runner optionally validates expected runtime versions and writes per-variant logs.

## What is checked

- Preflight checks EULA configuration, JAR accessibility and Java execution, and rejects detected Java versions below 21.
- The runtime provider uses standard Skript commands, effects, functions, conditions and logging. It does not depend on Skript's internal Java API or experimental test syntax.
- Startup evidence records Minecraft, Skript and Java versions in each completed runtime result, JSON history and the dashboard. Versions are read from output, not filenames. Unknown output stays unknown. Prereleases are marked in the dashboard.
- Observed Minecraft releases below 1.21 are rejected. Unknown future formats remain unverified rather than being mislabeled supported.
- A complete assertion sequence and clean server exit are required. Script load errors block a passing result. Passing one test confirms that test on that combination; it does not certify every Skript expression or addon.
- Offline rules are structural heuristics, not a replacement for each Skript release's parser. English runtime diagnostics are covered; other locales require verification.

## Repeatable local version matrix

Run the same runtime definitions against any number of local Paper/Skript/Java combinations. No JARs are downloaded or upgraded by the matrix runner. Each combination gets fresh isolated environments; the supplied server's worlds and configuration are not used.

Create a local JSON file:

```json
{
  "root": "C:/path/to/reward-lab",
  "tests": ["runtime.sktest.json"],
  "variants": [
    {
      "name": "My Minecraft and Skript combination",
      "config": {
        "javaPath": "C:/path/to/java.exe",
        "paperJarPath": "C:/path/to/paper.jar",
        "skriptJarPath": "C:/path/to/Skript.jar",
        "addonJarPaths": [],
        "memoryMb": 2048,
        "startupTimeoutMs": 240000,
        "eulaAccepted": false,
        "keepEnvironment": false
      }
    }
  ]
}
```

Set `eulaAccepted` only after accepting the [Minecraft EULA](https://www.minecraft.net/eula). Add more variant entries for other combinations. Targets are relative to `root`. Set the runtime definition's `timeoutMs` to 300000 or higher for cold starts.

```powershell
$env:SKTESTLAB_MATRIX_FILE = 'C:/path/to/local-matrix.json'
npm run test:matrix
```

Evidence is written to `.vscode-test/matrix-*/results.json`, including JAR SHA-256 hashes, observed versions, logs and individual assertion results. A non-passing test causes a nonzero exit code. See [verification](verification.md) for combinations actually exercised; accepting a version is separate from verifying it.
