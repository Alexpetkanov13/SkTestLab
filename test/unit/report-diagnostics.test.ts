import { it, expect } from "vitest";
import { report } from "../../src/reports/reports";
import { RunRecord } from "../../src/testing/model";
it("preserves mapped runtime errors in HTML and JUnit without active markup", () => {
  const record: RunRecord = {
    version: 1,
    id: "one",
    startedAt: "2026-10-23T10:00:00Z",
    durationMs: 1,
    environment: {},
    results: [
      {
        id: "credits",
        name: "Credits",
        file: "credits.sktest.json",
        mode: "runtime",
        targets: ["credits.sk"],
        status: "errored",
        durationMs: 1,
        assertions: [],
        error: "Script failed to load",
        runtimeDiagnostics: [
          {
            file: "credits.sk",
            line: 60,
            severity: "error",
            message: "Cannot understand <script>unsafe</script>",
          },
        ],
      },
    ],
  };
  for (const format of ["html", "junit"] as const) {
    const text = report(record, format);
    expect(text).toContain("credits.sk");
    expect(text).toContain("60");
    expect(text).not.toContain("<script>");
    expect(text).toContain("&lt;script&gt;");
  }
});
