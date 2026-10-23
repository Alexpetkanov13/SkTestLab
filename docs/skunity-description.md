[![SkTestLab logo](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/icon-v2-256.png)](https://github.com/Alexpetkanov13/SkTestLab)

# SkTestLab

**Write Skript. Run real tests. Ship with confidence.**

A testing workbench for Skript developers, right inside VS Code. Catch source issues, check your code offline, and run real Paper/Skript assertions. Bring your results together in a dashboard designed for everyday development.

**Free · MIT open source · Local execution · No account or telemetry required**

[![RELEASE: 1.0.0](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/version.png)](https://github.com/Alexpetkanov13/SkTestLab/releases/tag/v1.0.0)
[![VS CODE: 1.96+](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/vscode.png)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/install.md)
[![DESKTOP: Windows x64](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/windows.png)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![PAPER: 1.21+ target](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/paper.png)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![SKRIPT: 2.9–2.17 verified](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/skript.png)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![JAVA: 21 tested](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/java.png)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![LICENSE: MIT](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/badges/license.png)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/LICENSE.txt)

[Download 1.0.0](https://github.com/Alexpetkanov13/SkTestLab/releases/tag/v1.0.0) · [Getting started](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/getting-started.md) · [Support](https://github.com/Alexpetkanov13/SkTestLab/issues)

---

## Why SkTestLab?

A successful reload is a useful start. Repeatable tests help you check the behavior behind your scripts: reward calculations, boundary values, expected failures, and the functions you change most often.

Keep `.sk` files and `.sktest.json` tests together in your project. Run a check from VS Code's native Test Explorer, inspect the evidence, and rerun failures while you work.

### A real function. An explicit expectation.

From the included Reward Lab example, `reward.sk`:

```vb
function labReward(tasks: number, multiplier: number) :: number:
    if {_tasks} < 0:
        return 0
    if {_multiplier} < 0:
        return 0
    set {_coins} to floor({_tasks} * 10 * {_multiplier})
    if {_coins} > 1000:
        return 1000
    return {_coins}
```

Save this runtime test beside it as `reward-check.sktest.json`:

```json
{
  "schemaVersion": 1,
  "id": "reward-check",
  "name": "Five completed tasks earn 50 coins",
  "mode": "runtime",
  "targets": ["reward.sk"],
  "timeoutMs": 300000,
  "actions": ["set {_reward} to labReward(5, 1)"],
  "assertions": [
    { "condition": "{_reward} is 50", "message": "Expected 50 coins" }
  ]
}
```

Configure Runtime, then run it from Test Explorer. Keep `.sk` and `.sktest.json` files together in version control, so the behavior you expect travels with your script.

## Features

### 🔎 Diagnostics while you write

- Twelve configurable diagnostic rules with confidence labels.
- Targeted Quick Fixes and cross-file declaration warnings.
- Analyze a file or workspace from the Command Palette.
- Works alongside your existing syntax-highlighting extension.

### ⚡ Offline checks

- Assert diagnostics, declared symbols, source text, and structure.
- Run without Minecraft, server JARs, or Java.
- Versioned `.sktest.json` definitions, JSON Schema, and snippets.
- Generate starting expectations from declarations and review them before use.

### 🧪 Real Paper/Skript execution

- Select your compatible Paper/Skript JARs and Java executable.
- Invoke project functions and evaluate Skript conditions in console context.
- Disposable server environments, loopback networking, and owned-directory cleanup.
- Observed runtime versions and console evidence retained with results.

### ▶️ Native VS Code workflow

- Discover and organize tests in Test Explorer.
- Run selections, related-file tests, or an entire suite.
- Rerun failures, cancel execution, and inspect assertion differences.
- Project setup, test generation, analysis, and runtime validation commands.

### 📊 Results, history, and reports

- Searchable results, filters, sorting, and expandable assertion evidence.
- Source links, console excerpts, workspace history, and runtime readiness checks.
- Trends for comparable test selections and slowest-test insights.
- Export JSON, HTML, or JUnit reports; use the offline CLI for scripted checks.

## 🎨 Your dashboard, your style

Choose **White**, **Dark**, or **Follow VS Code**. Your appearance choice is remembered.

Search, filter, and sort results; expand assertion details; inspect runtime readiness; and follow trends for comparable test selections. Passing, failing, skipped, cancelled, and errored outcomes stay distinct, so incomplete runs do not become a misleading green result.

![SkTestLab dark dashboard](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/docs/images/dashboard-dark.png)

![SkTestLab white dashboard](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/docs/images/dashboard-white.png)

## 🎁 Included example: Reward Lab

Start with a small reward calculator written in ordinary Skript. Its tests check normal rewards, invalid inputs, rounding, and the reward cap, with **seven real runtime assertions** and an offline source check.

**No addons or automated players are needed for the example.**

The download contains **the SkTestLab extension and the Reward Lab example**.

## Installation

1. Download [the extension and example ZIP](https://github.com/Alexpetkanov13/SkTestLab/releases/download/v1.0.0/sktestlab-1.0.0-skunity.zip) and extract it.
2. In VS Code, open **Extensions → … → Install from VSIX** and select the included extension.
3. Extract `reward-lab.zip` and open its `reward-lab` folder in VS Code.
4. Run the example's offline test from Test Explorer, then use **SkTestLab: Open Dashboard** to inspect the result.
5. For real server tests, run **SkTestLab: Configure Runtime**, select your local Java and compatible Paper/Skript JARs, accept the Minecraft EULA, and run the runtime example.

## Requirements

| Component      | Requirement                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Editor         | VS Code 1.96 or newer                                                                           |
| Desktop        | Windows x64                                                                                     |
| Offline checks | No Minecraft server or Java required                                                            |
| Runtime server | Compatible Paper for Minecraft 1.21+                                                            |
| Skript         | Verified minor lines 2.9–2.17; choose a release compatible with your Paper version              |
| Java           | Java 21.0.12 used for recorded pairings; follow the requirements of your selected Paper release |
| Runtime setup  | Trusted workspace, local Java and JARs, Minecraft EULA acceptance                               |

Server and plugin JARs are obtained separately.

## Testing and compatibility

Ten exact Paper/Skript combinations passed seven Reward Lab assertions each, using Paper 1.21, 1.21.4, or 1.21.11 and Java 21.0.12. The badges summarize this scope; they do not certify every patch pairing. Newer servers may need a different Java version. Other combinations and addons need local verification. Linux, macOS, and Windows ARM64 are not certified for this release.

Release verification also includes **166 unit tests**, extension-host and distribution checks, and real runtime checks for failing assertions, parser errors, warning-only scripts, cancellation, and cleanup. See the [verification record](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/verification.md) for the scope and recorded evidence.

[View the exact tested pairings](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)

## Useful commands

Open the Command Palette and search for **SkTestLab**:

- **Initialize Project** and **Create Test** to get started.
- **Analyze Current File** or **Analyze Workspace** for diagnostics.
- **Run All Tests**, **Run Failed Tests**, and **Stop Tests** for execution.
- **Configure Runtime** and **Validate Runtime Environment** for server setup.
- **Open Dashboard**, **Open Test Logs**, and **Export Test Report** for results.

## Documentation

| Topic            | Guides                                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First project    | [Getting started](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/getting-started.md) · [Installation](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/install.md)             |
| Test definitions | [Assertions and lifecycle](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/testing-guide.md) · [Reward Lab](https://github.com/Alexpetkanov13/SkTestLab/tree/main/examples/reward-lab)    |
| Editor tools     | [Diagnostics](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/diagnostics.md) · [Configuration](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/configuration.md)              |
| Runtime          | [Paper/Skript testing](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/runtime-testing.md) · [Compatibility](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md) |
| Operations       | [Troubleshooting](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/troubleshooting.md) · [Verification](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/verification.md)        |
| Project          | [Architecture](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/architecture.md) · [Roadmap](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/roadmap.md)                        |

## Support and contributions

[Report a bug or request a feature](https://github.com/Alexpetkanov13/SkTestLab/issues). Contributions are welcome; read the [contribution guide](https://github.com/Alexpetkanov13/SkTestLab/blob/main/CONTRIBUTING.md).

When reporting an issue, include your SkTestLab, VS Code, Paper, Skript, and Java versions, relevant test output, and a small example that reproduces it. Remove private information before sharing logs.

## Known limitations

Offline checks use structural heuristics rather than a complete Skript parser. Runtime tests use console context and exported functions. Automated players, arbitrary event simulation, debugging, and coverage are outside version 1.0.0. Disposable environments keep production worlds separate; scripts and JARs still run with your operating system permissions.

## License

**MIT.** Free and open source. See the [license](https://github.com/Alexpetkanov13/SkTestLab/blob/main/LICENSE.txt).

---

**Made by DHeaven · SkTestLab 1.0.0 · MIT**
