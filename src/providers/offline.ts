import { analyze } from "../core/analyzer";
import {
  ExecutionProvider,
  TestCase,
  ExecutionContext,
  JsonValue,
} from "../testing/model";
import { isOffline } from "../testing/discovery";
import { assertValue } from "../testing/assertions";
export class OfflineProvider implements ExecutionProvider {
  readonly mode = "offline" as const;
  readonly capabilities = [
    "diagnostics",
    "symbols",
    "source",
    "structure",
  ] as const;
  async execute(test: TestCase, c: ExecutionContext) {
    const texts: string[] = [];
    for (const target of test.targets) {
      c.signal.throwIfAborted();
      texts.push(await c.read(target));
    }
    const analyses = texts.map((s) =>
      analyze(s, {
        disabledRules: c.disabledRules,
        skriptVersion: c.skriptVersion,
      }),
    );
    const results = [];
    for (const a of test.assertions) {
      c.signal.throwIfAborted();
      if (!isOffline(a))
        return {
          status: "unsupported" as const,
          assertions: [],
          error: "Runtime assertion requires Paper",
        };
      let actual: JsonValue;
      switch (a.kind) {
        case "diagnostic":
          actual = analyses
            .flatMap((r) => r.findings)
            .filter((f) => !a.rule || f.id === a.rule)
            .map((f) => f.id);
          break;
        case "symbol":
          actual = analyses
            .flatMap((r) => r.symbols)
            .filter((s) => !a.name || s.name === a.name)
            .map((s) => s.name);
          break;
        case "source":
          actual = texts.join("\n");
          break;
        case "structure":
          actual = analyses
            .flatMap((r) => r.flat)
            .filter((n) => !a.name || n.header === a.name)
            .map((n) => n.header);
          break;
      }
      results.push({
        passed: assertValue(actual, a.operator, a.expected),
        message: a.kind + " " + a.operator + (a.rule ? " " + a.rule : ""),
        expected: a.expected,
        actual,
      });
    }
    return {
      status: results.every((r) => r.passed)
        ? ("passed" as const)
        : ("failed" as const),
      assertions: results,
    };
  }
}
