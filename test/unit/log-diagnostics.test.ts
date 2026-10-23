import { it, expect } from "vitest";
import { SkriptLogDiagnostics } from "../../src/runtime/logDiagnostics";
it("recognizes observed constant-condition warnings from generated assertions", () => {
  const parser = new SkriptLogDiagnostics();
  parser.consume("[Skript] Line 5: (zz-sktestlab.sk)");
  parser.consume(
    "The condition 'false is equal to true' will always be false.",
  );
  expect(parser.blocksSuccess).toBe(false);
  expect(parser.findings[0].severity).toBe("warning");
});

it("recognizes multiline errors without a repeated Skript prefix", () => {
  const parser = new SkriptLogDiagnostics();
  for (const line of [
    "[13:23:49 INFO]: [Skript] Line 60: (project-0.sk)",
    "> ",
    "  ",
    "[13:23:49 INFO]:     Can't understand this structure: addon placeholder",
    "[13:23:49 INFO]:     Line: addon placeholder:",
  ])
    parser.consume(line);
  expect(parser.blocksSuccess).toBe(true);
  expect(parser.findings).toEqual([
    {
      file: "project-0.sk",
      line: 60,
      severity: "error",
      message: "Can't understand this structure: addon placeholder",
    },
  ]);
});
it("retains the observed list-conjunction warning without calling it a load error", () => {
  const parser = new SkriptLogDiagnostics();
  parser.consume("[Skript] Line 22: (project-0.sk)");
  parser.consume(
    "[13:23:50 INFO]:     List is missing 'and' or 'or', defaulting to 'and': a, b",
  );
  expect(parser.blocksSuccess).toBe(false);
  expect(parser.findings[0].severity).toBe("warning");
});
it("does not assume unknown diagnostic kinds or incomplete headers are harmless", () => {
  const parser = new SkriptLogDiagnostics();
  parser.consume("[Skript] Line 4: (project-0.sk)");
  expect(parser.blocksSuccess).toBe(true);
  parser.consume("A diagnostic from a future version");
  expect(parser.findings[0].severity).toBe("unknown");
  expect(parser.blocksSuccess).toBe(true);
});
it("preserves errors when followed by warnings", () => {
  const parser = new SkriptLogDiagnostics();
  parser.consume("[Skript] Line 60: (project-0.sk)");
  parser.consume("Can't understand this structure: custom syntax");
  parser.consume("[Skript] Line 22: (project-0.sk)");
  parser.consume("List is missing 'and' or 'or', defaulting to 'and': a,b");
  expect(parser.blocksSuccess).toBe(true);
  expect(parser.findings).toHaveLength(2);
});
