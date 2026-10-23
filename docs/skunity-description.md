# SkTestLab — Skript Testing & Diagnostics for VS Code

**Write Skript. Run real tests. Ship with confidence.**

Build your next Skript project with a testing workbench right inside VS Code. SkTestLab brings source diagnostics, fast offline checks, real Paper/Skript tests, and a polished results dashboard into one workflow.

Check a change, inspect a failure, rerun a test, and keep the evidence behind your results.

## Your script. Your tests. Your workspace.

- **Catch source issues early.** Get configurable diagnostics and targeted Quick Fixes while you work.
- **Start testing immediately.** Run offline checks for diagnostics, symbols, source, and structure without a Minecraft server.
- **Exercise real Skript code.** Use your own compatible Paper and Skript JARs to run runtime assertions in a disposable server environment.
- **Make failures easier to investigate.** Inspect assertions, source diagnostics, console excerpts, and observed runtime versions.
- **Keep your testing flow.** Discover tests in VS Code's native Test Explorer, rerun failures, cancel runs, and revisit saved history.
- **See the bigger picture.** Search, filter, sort, expand results, and compare runs with the same test selection.
- **Share useful reports.** Export JSON, HTML, or JUnit results.
- **Make it yours.** Choose White, Dark, or Follow VS Code. The dashboard remembers your choice.

**Free. MIT open source. Local execution. No account or telemetry required.**

## Get your first green check

1. Extract the download ZIP and install the included VSIX using **Extensions → … → Install from VSIX**.
2. Extract `reward-lab.zip` and open the `reward-lab` folder in VS Code.
3. Run its offline test, then open **SkTestLab: Open Dashboard**.
4. For real server testing, use **SkTestLab: Configure Runtime**, select your local files, and run the included reward test with seven assertions.

The download contains the SkTestLab extension and the Reward Lab example.

## Requirements

**Windows x64 · VS Code 1.96+**

Offline checks need neither Minecraft nor Java. Runtime tests need a trusted workspace, suitable Java, your own compatible Paper/Skript JARs, and your acceptance of the Minecraft EULA. Server/plugin JARs are obtained separately.

Minecraft **1.21+** is the compatibility target with a matching Skript release. **Verified Skript minor lines: 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16 and 2.17.** Exact tested releases are 2.9.0, 2.10.0, 2.11.0, 2.12.0, 2.13.0, 2.14.0, 2.15.0, 2.16.0, 2.17.0 and 2.17.1. Each passed seven real reward-function assertions using compatible Paper 1.21, 1.21.4 or 1.21.11 and Java 21.0.12. See the [exact pairing table](https://github.com/Alexpetkanov13/SkTestLab/blob/main/docs/compatibility.md). This is not a promise that every Skript patch works on every Minecraft patch. Other combinations and addons need local verification. Other operating systems and Windows ARM64 are not certified.

## Know what your results mean

Offline analysis uses structural heuristics. Runtime tests use console context and exported functions. Automated players, arbitrary event simulation, debugging, and coverage are outside this release. Disposable environments keep production worlds separate; scripts and JARs still run with your OS permissions. Skipped, cancelled, and errored tests never count as passed.

[GitHub project](https://github.com/Alexpetkanov13/SkTestLab) · [Support and issues](https://github.com/Alexpetkanov13/SkTestLab/issues)
