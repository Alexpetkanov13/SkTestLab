# Testing guide

## Format and lifecycle

One `.sktest.json` file is one test with multiple assertions. `schemaVersion` is 1. IDs accept 1–100 ASCII letters, digits, underscores and hyphens. Native identity combines file URI and ID. Targets are relative `.sk` paths from the owning workspace folder. Absolute paths and symlink escapes are rejected. Limits: 1 MiB definitions, 100 targets and 1000 assertions. Unknown fields are errors.

Optional fields: description, tags, timeoutMs (100–600000), skip and template. Runtime setup/actions/cleanup arrays contain single-line effects. Order: setup → actions → assertions → cleanup. Put multiline behavior in project functions. Timeout is errored; template is not-executed.

## Offline assertions

Each assertion has kind, operator and optional expected, rule or name. `diagnostic` returns diagnostic IDs, filtered by rule. `symbol` returns names, filtered by exact name. `source` returns concatenated target text in target order. `structure` returns parsed headers, filtered by exact name. These do not evaluate Skript.

| Operator               | Meaning                                        |
| ---------------------- | ---------------------------------------------- |
| equal / notEqual       | Deep strict JSON comparison                    |
| greater / less         | Numeric comparison                             |
| truthy                 | JavaScript truthiness; empty arrays are truthy |
| set / unset            | Defined and non-null / absent or null          |
| size                   | String/array length equals expected            |
| contains / notContains | Substring or deep-equal array member           |

Use size: 0 for absence; set does not mean nonempty. Arrays preserve ordering and duplicates. Expected static failures can assert a diagnostic count:

```json
{ "kind": "diagnostic", "rule": "SK002", "operator": "size", "expected": 1 }
```

## Runtime assertions

Use single-line `condition` and optional `message`. Skript evaluates native equality, numeric, set/unset, size and containment conditions. Reports retain booleans, not typed expression values. Expected runtime exceptions, player events and output capture are not implemented.

A real integration test invokes project logic. The economy example calls purchase(30) and checks its return/balance. Merely setting/checking fixture variables tests only the harness.

## Selection and results

Native Run selects tests/files/folders. Commands run current-file targets, failed tests, tags and last selection. Providers run sequentially; configurable parallelism is deferred. One editor run is active at a time.

States include passed, failed, errored, skipped, cancelled, unsupported and not-executed. Native cancelled/unsupported/not-executed map to skipped with explanation. Runtime cancellation waits for process closure and cleanup. Missing completion is errored. Early stop/return can bypass cleanup effects; the disposable environment is still removed unless retained.

## Offline CLI

```sh
node dist/cli.js examples/beginner/script.sktest.json --junit=results.xml
```

Supply explicit paths; shell glob expansion differs. CLI uses default analyzer settings, emits JSON, optionally writes JUnit and exits 1 for non-pass or 2 for malformed input. Runtime definitions are unsupported, never silently passed.

## Installation walkthrough

Use this optional walkthrough to check a Windows x64 installation. Keep issue reports tied to the exact VSIX version and SHA-256 checksum. Do not test untrusted scripts or use a production Minecraft world.

1. Extract the download ZIP and follow INSTALL.md in a new VS Code window/profile. Record whether any installation step is unclear. You should not need Node or Python to use the extension.
2. Open the portable Reward Lab folder and run its offline test. Open the dashboard and switch **Theme → White**, then **Dark**. Close/reopen it to check the choice persists. Try **Follow VS Code** with a light, dark and high-contrast editor theme.
3. Use Tab/Enter and the skip link to navigate. Press `/` for search and Escape to clear. Try filters, sorting, expanded assertions and a narrow editor panel. Report clipped controls or unreadable text.
4. Configure Runtime through its actual dialogs using compatible local Paper/Skript/Java files. Read and accept the Minecraft EULA yourself. Run the reward runtime test; expect seven passing assertions.
5. Change an expected reward from 50 to 51. Confirm a failure, inspect expected/received details and source navigation, then restore the expectation. Use the Export report button to save JSON, HTML and JUnit through the real dialogs and open the saved files.
6. Cancel a runtime test. Review the log and confirm the test is cancelled rather than passed. If an environment remains, inspect it with Recover Runtime Environments; do not manually delete a directory used by a live server.
7. Upgrade from a prior candidate and check that saved history/settings remain. Uninstall and confirm your own scripts/test definitions remain.

### Reporting a problem

Use GitHub Issues at https://github.com/Alexpetkanov13/SkTestLab/issues with these details:

- Release version and downloaded file checksum:
- Windows/architecture and VS Code version:
- Java, Paper, Skript and addon versions (if testing runtime):
- Which numbered steps were completed:
- What you expected and what actually happened:
- Exact reproduction steps and smallest safe script/test fixture:
- Setup/export dialog feedback:
- Theme, keyboard and narrow-layout observations:
- Upgrade/uninstall observations:
- Blocking problem, minor issue, suggestion, or no issues found:

Attach only sanitized logs/screenshots. Do not include credentials, private paths you want kept private, production worlds or unrelated project files. Verification evidence is recorded separately in docs/verification.md.
