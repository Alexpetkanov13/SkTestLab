# Diagnostic reference

Structural confidence describes supported source shapes, not runtime parser confirmation. Heuristics need review. Unknown addon syntax stays unvalidated. Findings cover the affected source line; fixes use narrower ranges.

| ID    | Default severity / confidence | Finding                                      | Fix                             |
| ----- | ----------------------------- | -------------------------------------------- | ------------------------------- |
| SK001 | warning / structural          | Mixed indentation prefix                     | Equal-width spaces; tab width 4 |
| SK002 | error / structural            | Missing known section colon                  | Insert before inline comment    |
| SK003 | warning / structural          | Empty recognized block                       | None                            |
| SK004 | warning / structural          | Sibling after stop/return                    | None                            |
| SK005 | warning / heuristic           | Ambiguous nested loop-number outside strings | None                            |
| SK006 | error / structural            | Duplicate function/command in file           | None                            |
| SK006 | warning / heuristic           | Declaration across analyzed files            | None                            |
| SK007 | warning / heuristic           | Single local write without textual use       | None                            |
| SK008 | warning / heuristic           | Excessive nesting                            | None                            |
| SK009 | warning / heuristic           | Broad scan in frequent event                 | None                            |
| SK010 | error / structural            | Incomplete function/command                  | None                            |
| SK011 | error / structural            | Indentation without section                  | None                            |
| SK012 | warning / structural          | Local function under selected Skript <2.7    | None                            |

Disable through analysis.disabledRules, e.g. ["SK007","SK009"]. Inline suppression/severity overrides are not implemented. Quick Fixes use WorkspaceEdit and support undo. No broad formatting/renaming.

Limits: no complete flow/type inference, undefined-local proof, arity, interpolation analysis, addon catalogs or whole-file indentation consistency. Unused-local detection counts strings to avoid false warnings.
