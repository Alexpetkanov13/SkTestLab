import { it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { analyze } from "../../src/core/analyzer";
it("analyzes 10,000 lines within a generous 5 second budget", () => {
  const source = Array.from(
    { length: 2500 },
    (_, i) =>
      "function f" +
      i +
      '():\n    if true is true:\n        send "text # :"\n    stop',
  ).join("\n");
  const start = performance.now();
  const a = analyze(source);
  expect(a.flat.length).toBe(10000);
  expect(a.findings).toEqual([]);
  expect(performance.now() - start).toBeLessThan(5000);
});
