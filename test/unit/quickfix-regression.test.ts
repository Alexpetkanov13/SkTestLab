import { it, expect } from "vitest";
import { analyze } from "../../src/core/analyzer";
import { escapeHtml } from "../../src/security/paths";
it("removes XML-invalid control characters from report values", () => {
  expect(escapeHtml("name\x00\x01\ufffe<")).toBe("name&lt;");
});
it("inserts a missing colon before an inline comment", () => {
  const source = "on join # keep comment";
  const f = analyze(source).findings.find((f) => f.id === "SK002")!.fix!;
  const fixed =
    source.slice(0, f.range.start) + f.text + source.slice(f.range.end);
  expect(fixed).toBe("on join: # keep comment");
});
it("does not rewrite strings or addon effects", () => {
  const source = 'on load:\n    send "on join # :"\n    addon effect';
  expect(analyze(source).findings.filter((f) => f.fix)).toEqual([]);
});
it("finds unused writes but respects uses in strings", () => {
  expect(
    analyze("on load:\n    set {_x} to 1").findings.map((f) => f.id),
  ).toContain("SK007");
  expect(
    analyze('on load:\n    set {_x} to 1\n    send "%{_x}%"').findings.map(
      (f) => f.id,
    ),
  ).not.toContain("SK007");
});
