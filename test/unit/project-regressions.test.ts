import { describe, expect, it } from "vitest";
import { analyze } from "../../src/core/analyzer";

describe("issues found while analyzing ChickFarm", () => {
  it("preserves Java-style calls on loop-value without offering a colon fix", () => {
    const source =
      "function clearEntities():\n    loop {entities::*}:\n        if loop-value is set:\n            loop-value.remove()";
    const result = analyze(source);
    expect(result.findings).toEqual([]);
    expect(result.flat.at(-1)?.code).toBe("loop-value.remove()");
  });
  it.each([
    "loop-index",
    "loop-number",
    "if-addon()",
    "function-helper()",
    "command-result",
  ])("does not confuse %s with a section keyword", (effect) => {
    expect(
      analyze("on load:\n    " + effect).findings.filter(
        (f) => f.id === "SK002",
      ),
    ).toEqual([]);
  });
  it("does not treat addon return-type metadata as a terminating return", () => {
    const result = analyze(
      'expression custom value:\n    return type: string\n    get:\n        return "value"',
    );
    expect(result.findings.filter((f) => f.id === "SK004")).toEqual([]);
  });
  it("does not call one numeric loop inside a list loop ambiguous", () => {
    const result = analyze(
      'on load:\n    loop {entries::*}:\n        loop 12 times:\n            set {_angle} to loop-number * 30\n            send "%{_angle}%" to console',
    );
    expect(result.findings.filter((f) => f.id === "SK005")).toEqual([]);
  });
  it("still identifies two unqualified numeric loops", () => {
    const result = analyze(
      "on load:\n    loop 3 times:\n        loop 12 times:\n            send loop-number to console",
    );
    expect(result.findings.filter((f) => f.id === "SK005")).toHaveLength(1);
  });
});
