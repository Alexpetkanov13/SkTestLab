import { RunRecord } from "../testing/model";
/** Only compare identical test selections; unrelated runs cannot be regressions. */
export function sameSelection(a: RunRecord, b: RunRecord): boolean {
  const keys = (r: RunRecord) =>
    r.results.map((t) => JSON.stringify([t.file, t.id, t.mode])).sort();
  return JSON.stringify(keys(a)) === JSON.stringify(keys(b));
}
export function runInsights(run?: RunRecord, previous?: RunRecord) {
  const results = run?.results ?? [];
  const assertions = results.flatMap((r) => r.assertions);
  const executed = results.filter((r) =>
    ["passed", "failed", "errored"].includes(r.status),
  );
  return {
    assertions: assertions.length,
    passedAssertions: assertions.filter((a) => a.passed).length,
    offline: results.filter((r) => r.mode === "offline").length,
    runtime: results.filter((r) => r.mode === "runtime").length,
    slowest: [...executed].sort((a, b) => b.durationMs - a.durationMs)[0],
    durationDelta:
      run && previous && sameSelection(run, previous)
        ? run.durationMs - previous.durationMs
        : undefined,
  };
}
