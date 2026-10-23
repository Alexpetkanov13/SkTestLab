# Minecraft and Skript compatibility

The initial supported desktop platform is **Windows x64**. Release VSIX files target `win32-x64`. The three pairings in verification.md are the tested combinations; accepting other versions does not certify them. Linux, macOS, Windows ARM64 and 26.x runtime combinations remain unverified for release support.

SkTestLab 0.2.0 targets Paper for Minecraft **1.21 and newer**, including year-based releases such as 26.x. It accepts user-selected Skript JARs without restricting a release number. The selected Skript release and addons must themselves support the selected Paper version. Future releases remain subject to upstream behavior and local verification.

There is no universal Minecraft/Skript pairing. [Skript 2.9.0](https://github.com/SkriptLang/Skript/releases/tag/2.9.0) introduced Minecraft 1.21 support. [Skript 2.14.0](https://github.com/SkriptLang/Skript/releases/tag/2.14.0) lists 1.21.0–1.21.11. Newer Skript releases can drop older Minecraft patches; check each release's [official support range](https://github.com/SkriptLang/Skript/releases). Use the Java version required by [your Paper release](https://docs.papermc.io/paper/getting-started/); Java 21 is the minimum baseline, not a promise that every newer server runs on Java 21.

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
