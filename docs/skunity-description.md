[![SkTestLab logo](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/assets/icon-v2-256.png)](https://github.com/Alexpetkanov13/SkTestLab)

# SkTestLab

**Write Skript. Run real tests. Ship with confidence.**

A testing workbench for Skript developers, right inside VS Code. Catch source issues, check your code offline, and run real Paper/Skript assertions. Bring your results together in a dashboard designed for everyday development.

**Free · MIT open source · Local execution · No account or telemetry required**

[![Version: 1.0.0](https://img.shields.io/static/v1?label=Version&message=1.0.0&color=10b981)](https://github.com/Alexpetkanov13/SkTestLab)
[![VS Code: 1.96+](https://img.shields.io/static/v1?label=VS%20Code&message=1.96%2B&color=007acc)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/install.md)
[![Platform: Windows x64](https://img.shields.io/static/v1?label=Platform&message=Windows%20x64&color=475569)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![Paper: 1.21+ target](https://img.shields.io/static/v1?label=Paper&message=1.21%2B%20target&color=0284c7)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![Skript: 2.9–2.17 verified](https://img.shields.io/static/v1?label=Skript&message=2.9%E2%80%932.17%20verified&color=f97316)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![Java: 21 tested](https://img.shields.io/static/v1?label=Java&message=21%20tested&color=dc2626)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
[![License: MIT](https://img.shields.io/static/v1?label=License&message=MIT&color=65a30d)](https://github.com/Alexpetkanov13/SkTestLab/blob/main/LICENSE.txt)

## Why SkTestLab?

A successful reload is a useful start. Repeatable tests help you check the behavior behind your scripts: reward calculations, boundary values, expected failures, and the functions you change most often.

Keep `.sk` files and `.sktest.json` tests together in your project. Run a check from VS Code's native Test Explorer, inspect the evidence, and rerun failures while you work.

## A complete testing workflow

- **Source diagnostics and Quick Fixes.** Spot configurable source issues as you edit, with targeted fixes where available.
- **Fast offline checks.** Assert diagnostics, symbols, source text, and structure without starting Minecraft or installing Java.
- **Real Paper/Skript execution.** Select your compatible local JARs and run assertions in disposable server environments.
- **Evidence you can inspect.** Review individual assertions, source diagnostics, console excerpts, and observed runtime versions.
- **Native Test Explorer.** Discover tests, run selections, rerun failures, and cancel execution from familiar VS Code controls.
- **Saved run history.** Revisit earlier results and compare runs with the same test selection.
- **Reports for your workflow.** Export JSON, HTML, or JUnit results for investigation and sharing.

## Your dashboard, your style

Choose **White**, **Dark**, or **Follow VS Code**. Your appearance choice is remembered.

Search, filter, and sort results; expand assertion details; inspect runtime readiness; and follow trends for comparable test selections. Passing, failing, skipped, cancelled, and errored outcomes stay distinct, so incomplete runs do not become a misleading green result.

![SkTestLab dark dashboard](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/docs/images/dashboard-dark.png)

![SkTestLab white dashboard](https://raw.githubusercontent.com/Alexpetkanov13/SkTestLab/main/docs/images/dashboard-white.png)

## Included example: Reward Lab

Start with a small reward calculator written in ordinary Skript. Its tests check normal rewards, invalid inputs, rounding, and the reward cap, with **seven real runtime assertions** and an offline source check.

**No addons or automated players are needed for the example.**

The download contains **the SkTestLab extension and the Reward Lab example**.

## Installation

1. Extract the download ZIP.
2. In VS Code, open **Extensions → … → Install from VSIX** and select the included extension.
3. Extract `reward-lab.zip` and open its `reward-lab` folder in VS Code.
4. Run the example's offline test from Test Explorer, then use **SkTestLab: Open Dashboard** to inspect the result.
5. For real server tests, run **SkTestLab: Configure Runtime**, select your local Java and compatible Paper/Skript JARs, accept the Minecraft EULA, and run the runtime example.

## Requirements and compatibility

- **Editor:** VS Code 1.96 or newer on Windows x64.
- **Offline tests:** no Minecraft server or Java required.
- **Runtime tests:** trusted workspace, suitable Java, compatible Paper/Skript JARs, and Minecraft EULA acceptance. Obtain server and plugin JARs separately.
- **Minecraft target:** Paper for Minecraft 1.21 and newer, paired with a Skript release that supports that server.
- **Verified Skript minor lines:** 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16, and 2.17.

Ten exact Paper/Skript combinations passed seven Reward Lab assertions each, using Paper 1.21, 1.21.4, or 1.21.11 and Java 21.0.12. The badges summarize this scope; they do not certify every patch pairing. Newer servers may need a different Java version. Other combinations and addons need local verification. Linux, macOS, and Windows ARM64 are not certified for this release.

[View the exact tested pairings](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)

## Documentation and support

- [Installation guide](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/install.md)
- [Writing tests and assertions](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/testing-guide.md)
- [Runtime testing](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/runtime-testing.md)
- [Compatibility and tested versions](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md)
- [Report a bug or request a feature](https://github.com/Alexpetkanov13/SkTestLab/issues)
- [GitHub project](https://github.com/Alexpetkanov13/SkTestLab)

When reporting an issue, include your SkTestLab, VS Code, Paper, Skript, and Java versions, relevant test output, and a small example that reproduces it. Remove private information before sharing logs.

## Current scope

Offline checks use structural heuristics rather than a complete Skript parser. Runtime tests use console context and exported functions. Automated players, arbitrary event simulation, debugging, and coverage are outside version 1.0.0. Disposable environments keep production worlds separate; scripts and JARs still run with your operating system permissions.

**Made by DHeaven · SkTestLab 1.0.0 · MIT**
