# ChickFarm verification — 2026-10-23

The project contained 86 .sk files: 43 active-named scripts and 43 matching backups, totaling 33,870 lines, plus one existing runtime definition.

Original inputs were read-only; all 87 hashes remained unchanged. Snapshots/generated checks stayed in ignored .vscode-test storage. Separate VS Code profiles/hosts were used; the owner's original VS Code window was not controlled.

## Static and native Testing results

- Core scan: approximately 244 ms across 86 scripts.
- After fixes: no structural errors from the implemented rules in the 43 active scripts.
- Remaining heuristics: 51 nesting-depth and 13 possibly unused-local warnings. These require review, not automatic fixes.
- Including backups produces 700 declaration warnings. Their extension is still .sk; SkTestLab does not silently assume they should be ignored.
- 44 generated offline checks passed in native Test Explorer on local snapshots. They verify structure/declarations, not Minecraft behavior.
- Batched publication reduced the measured native multi-root scan from about 14.3 to 1.2 seconds, including original files and verification snapshots.

Three static false positives were fixed: loop-value.remove() was mistaken for a section, addon return-type metadata was treated as an effect, and list loops counted as competing numeric loops. Synthetic regression fixtures cover these without copying private project code into the repository.

## Actual runtime results

Used owner-provided Paper 1.21.11-132, Skript 2.16.0 and SkCine 1.0.1 with Java 21.0.12, in disposable loopback-only environments.

Unmodified spawn.sk loaded and passed a script-loaded assertion. This confirms parsing/loading; no player join or teleport interaction was simulated.

Full credits.sk could not load cleanly with the supplied plugin set:

| Original location | Actual Skript finding                |
| ----------------- | ------------------------------------ |
| credits.sk:60     | Unsupported PlaceholderAPI structure |
| credits.sk:71     | Unsupported tab-completion structure |
| credits.sk:22     | List conjunction warning             |

The formatter could execute while two other structures failed. This exposed a critical 0.1.0 bug: multiline errors were missed, allowing a passing assertion to mask load errors. Version 0.1.1 classifies multiline diagnostics, blocks success and stops at startup without inventing assertion results. Native Problems/Test Explorer map errors to original filenames/lines.

The existing credits.sktest.json has a constant-false placeholder and no actions. It was not rewritten. Even after supplying missing addon support, it needs a meaningful expectation before it tests useful project behavior.

## Reproduce read-only checks

```powershell
$env:SKTESTLAB_PROJECT_ROOT = 'C:\Skript Projects\ChickFarm'
npm run test:project
```

This generates snapshots and offline checks without modifying the project. Set SKTESTLAB_RUNTIME_CONFIG to a local JSON file of runtime settings to enable the additional project-specific runtime check. Its source-line assertions deliberately target this recorded ChickFarm scenario; adapt them for other projects.

See [runtime testing](runtime-testing.md) for the portable five-case server suite.
