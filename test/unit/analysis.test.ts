import { describe, it, expect } from "vitest";
import {
  analyze,
  AnalysisCache,
  crossFileDuplicates,
} from "../../src/core/analyzer";
import { lex } from "../../src/core/lexer";
describe("source scanner", () => {
  it("preserves exact text and ranges", () => {
    const line = '    send "hello # world: ""yes""" # if broken';
    const tokens = lex(line);
    expect(tokens.map((t) => t.text).join("")).toBe(line);
    for (const t of tokens) expect(line.slice(t.start, t.end)).toBe(t.text);
    expect(tokens.filter((t) => t.kind === "comment")).toHaveLength(1);
  });
  it("recognizes nested interpolated variables and options", () => {
    expect(
      lex("set {list::%{_index}%} to {@value}")
        .filter((t) => t.kind === "variable" || t.kind === "option")
        .map((t) => t.text),
    ).toEqual(["{list::%{_index}%}", "{@value}"]);
  });
  it("does not treat unicode strings as declarations", () =>
    expect(
      analyze(
        '# function fake():\non load:\n    send "Здравей: # 世界"',
      ).symbols.map((s) => s.kind),
    ).toEqual(["event"]));
});
describe("structural analysis", () => {
  const ids = (source: string) => analyze(source).findings.map((f) => f.id);
  it("builds nested source preserving sections", () => {
    const a = analyze(
      "function reward(n: number) :: number:\n    if {_n} > 0:\n        return {_n}\n    return 0",
    );
    expect(a.nodes).toHaveLength(1);
    expect(a.nodes[0].children).toHaveLength(2);
    expect(a.symbols[0].name).toBe("reward");
    expect(a.source).toContain("return 0");
  });
  it("warns on empty blocks", () => expect(ids("on join:")).toContain("SK003"));
  it("warns on mixed indentation with a safe prefix edit", () => {
    const f = analyze('on join:\n \tsend "hi"').findings.find(
      (f) => f.id === "SK001",
    )!;
    expect(f.range.line).toBe(1);
    expect(f.fix?.text).toBe("     ");
  });
  it("fixes a known missing section delimiter", () => {
    const source = "on join";
    const f = analyze(source).findings.find((f) => f.id === "SK002")!;
    expect(
      source.slice(0, f.fix!.range.start) +
        f.fix!.text +
        source.slice(f.fix!.range.end),
    ).toBe("on join:");
  });
  it("leaves unknown addon syntax alone", () =>
    expect(ids("custom addon section:\n    do addon magic")).toEqual([]));
  it("reports incomplete declarations", () =>
    expect(ids("function :")).toContain("SK010"));
  it("reports unreachable siblings but not conditional exits", () => {
    expect(ids('on load:\n    stop\n    send "x"')).toContain("SK004");
    expect(
      ids('on load:\n    if true is true:\n        stop\n    send "x"'),
    ).not.toContain("SK004");
  });
  it("reports duplicate command and function definitions", () => {
    const a = analyze(
      "command /foo:\n    trigger:\n        stop\ncommand /foo:\n    trigger:\n        stop",
    );
    expect(a.findings.filter((f) => f.id === "SK006")).toHaveLength(1);
  });
  it("reports ambiguous nested loop-number but ignores strings", () => {
    expect(
      ids(
        "on load:\n    loop 3 times:\n        loop 4 times:\n            send loop-number",
      ),
    ).toContain("SK005");
    expect(
      ids(
        'on load:\n    loop 3 times:\n        loop 4 times:\n            send "loop-number"',
      ),
    ).not.toContain("SK005");
  });
  it("respects suppression and selected version", () => {
    expect(
      analyze("on join", { disabledRules: ["SK002"] }).findings.map(
        (f) => f.id,
      ),
    ).not.toContain("SK002");
    expect(
      analyze("local function f():\n    stop", {
        skriptVersion: "2.6",
      }).findings.map((f) => f.id),
    ).toContain("SK012");
    expect(
      analyze("local function f():\n    stop").findings.map((f) => f.id),
    ).not.toContain("SK012");
  });
  it("warns on expensive frequent-event operations and depth", () => {
    expect(ids("on move:\n    loop all entities:\n        stop")).toContain(
      "SK009",
    );
    expect(
      analyze(
        "on load:\n    if true is true:\n        loop 3 times:\n            stop",
        { maxDepth: 1 },
      ).findings.map((f) => f.id),
    ).toContain("SK008");
  });
  it("invalidates revisions and bounds the cache", () => {
    const c = new AnalysisCache();
    const a = c.get("a", 1, "on join");
    expect(c.get("a", 1, "ignored")).toBe(a);
    expect(c.get("a", 2, "on join:\n    stop").findings).toEqual([]);
    c.clear();
    expect(c.get("a", 1, "on join")).not.toBe(a);
  });
  it("detects cross-file global declaration collisions", () => {
    expect(
      crossFileDuplicates(
        new Map([
          ["a", analyze("function f():\n    stop")],
          ["b", analyze("function f():\n    stop")],
        ]),
      ).get("b"),
    ).toHaveLength(1);
  });
});
