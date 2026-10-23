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
