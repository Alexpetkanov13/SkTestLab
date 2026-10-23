import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseTest, stableId } from "../../src/testing/discovery";
import { assertValue } from "../../src/testing/assertions";
import { OfflineProvider } from "../../src/providers/offline";
import { runTests } from "../../src/testing/runner";
import { ExecutionProvider, TestCase } from "../../src/testing/model";
import { History } from "../../src/testing/history";
import { report } from "../../src/reports/reports";
const test: TestCase = {
  schemaVersion: 1,
  id: "a",
  name: "A",
  mode: "offline",
  targets: ["file.sk"],
  assertions: [
    { kind: "symbol", name: "f", operator: "contains", expected: "f" },
  ],
};
const context = () => ({
  root: process.cwd(),
  signal: new AbortController().signal,
  read: async () => "function f():\n    stop",
});
describe("definitions", () => {
  it("accepts a documented definition", () =>
    expect(parseTest(JSON.stringify(test), process.cwd())).toEqual(test));
  it.each([
    { ...test, schemaVersion: 2 },
    { ...test, id: "../evil" },
    { ...test, targets: ["../out.sk"] },
    { ...test, targets: ["C:/outside.sk"] },
    { ...test, assertions: [] },
    { ...test, timeoutMs: Infinity },
    { ...test, unexpected: 1 },
    { ...test, setup: ["one\ntwo"] },
    { ...test, assertions: [{ kind: "source", operator: "equal" }] },
  ])("rejects invalid input %#", (v) =>
    expect(() => parseTest(JSON.stringify(v), process.cwd())).toThrow(),
  );
  it("keeps duplicate names separate by file", () =>
    expect(stableId("one", "a")).not.toBe(stableId("two", "a")));
});
describe("assertions", () => {
  it.each([
    [2, "equal", 2, true],
    [2, "notEqual", 2, false],
    [3, "greater", 2, true],
    [2, "less", 3, true],
    [true, "truthy", null, true],
    [0, "set", null, true],
    [undefined, "unset", null, true],
    [[1, 2], "size", 2, true],
    [[{ a: 1 }], "contains", { a: 1 }, true],
    ["abc", "notContains", "d", true],
    [null, "notContains", "d", false],
  ] as const)("checks %s %s", (actual, op, expected, passed) =>
    expect(assertValue(actual as never, op, expected as never)).toBe(passed),
  );
});
describe("execution", () => {
  it("runs real offline symbol and diagnostics checks", async () => {
    const r = await runTests(
      [{ file: "test", test }],
      [new OfflineProvider()],
      context(),
    );
    expect(r.results[0].status).toBe("passed");
  });
  it("reports actual failure", async () => {
    const r = await runTests(
      [
        {
          file: "test",
          test: {
            ...test,
            assertions: [
              { kind: "diagnostic", operator: "size", expected: 10 },
            ],
          },
        },
      ],
      [new OfflineProvider()],
      context(),
    );
    expect(r.results[0].status).toBe("failed");
    expect(r.results[0].assertions[0].actual).toEqual([]);
  });
  it.each([
    ["skip", "skipped"],
    ["template", "not-executed"],
  ] as const)("never passes %s", async (key, status) => {
    const r = await runTests(
      [{ file: "test", test: { ...test, [key]: true } }],
      [new OfflineProvider()],
      context(),
    );
    expect(r.results[0].status).toBe(status);
  });
  it("reports unsupported providers", async () => {
    expect(
      (await runTests([{ file: "test", test }], [], context())).results[0]
        .status,
    ).toBe("unsupported");
  });
  it("cancels queued tests", async () => {
    const c = new AbortController();
    c.abort();
    expect(
      (
        await runTests([{ file: "test", test }], [new OfflineProvider()], {
          ...context(),
          signal: c.signal,
        })
      ).results[0].status,
    ).toBe("cancelled");
  });
  it("classifies provider crashes", async () => {
    const p: ExecutionProvider = {
      mode: "offline",
      capabilities: [],
      execute: async () => {
        throw new Error("crash");
      },
    };
    expect(
      (await runTests([{ file: "test", test }], [p], context())).results[0]
        .error,
    ).toContain("crash");
  });
  it("aborts and classifies timeout", async () => {
    const p: ExecutionProvider = {
      mode: "offline",
      capabilities: [],
      execute: async (_, c) =>
        new Promise((_, reject) =>
          c.signal.addEventListener("abort", () => reject(c.signal.reason)),
        ),
    };
    const r = await runTests(
      [{ file: "test", test: { ...test, timeoutMs: 100 } }],
      [p],
      context(),
    );
    expect(r.results[0].status).toBe("errored");
    expect(r.results[0].error).toBe("Test timed out");
  });
  it("executes mutating tests sequentially", async () => {
    let active = 0,
      max = 0;
    const p: ExecutionProvider = {
      mode: "offline",
      capabilities: [],
      execute: async () => {
        active++;
        max = Math.max(max, active);
        await new Promise((r) => setTimeout(r, 10));
        active--;
        return { status: "passed", assertions: [] };
      },
    };
    await runTests(
      [
        { file: "a", test },
        { file: "b", test },
      ],
      [p],
      context(),
    );
    expect(max).toBe(1);
  });
  it("roundtrips history and escapes HTML/XML report values", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "sktl-history-"));
    try {
      const h = new History(dir);
      const run = await runTests(
        [
          {
            file: "x",
            test: { ...test, name: "<script>alert(1)</script>", skip: true },
          },
        ],
        [],
        context(),
      );
      run.id = randomUUID();
      await h.save(run);
      expect((await h.list())[0]).toEqual(run);
      expect(report(run, "html")).not.toContain("<script>");
      expect(report(run, "junit")).toContain("<skipped");
      expect(JSON.parse(report(run, "json")).results[0].status).toBe("skipped");
      await h.clear();
      expect(await h.list()).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
