import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
  validate: vi.fn(),
  prepare: vi.fn(),
  cleanup: vi.fn(),
}));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
vi.mock("../../src/runtime/environment", () => ({
  validateRuntime: mocks.validate,
  prepareEnvironment: mocks.prepare,
}));
import { PaperProvider } from "../../src/providers/paper";
import { RuntimeConfig } from "../../src/runtime/environment";
import { TestCase } from "../../src/testing/model";
const cfg: RuntimeConfig = {
  javaPath: "java",
  paperJarPath: "p.jar",
  skriptJarPath: "s.jar",
  addonJarPaths: [],
  memoryMb: 1024,
  startupTimeoutMs: 1000,
  keepEnvironment: false,
  eulaAccepted: true,
};
const test: TestCase = {
  schemaVersion: 1,
  id: "t",
  name: "test",
  mode: "runtime",
  targets: ["x.sk"],
  assertions: [{ condition: "true is true" }],
};
let child: EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: ReturnType<typeof vi.fn>;
};
beforeEach(() => {
  vi.clearAllMocks();
  child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(),
  });
  mocks.spawn.mockReturnValue(child);
  mocks.validate.mockResolvedValue("Java");
  mocks.prepare.mockResolvedValue({
    directory: "owned",
    nonce: "abc",
    command: "sktlabc",
    cleanup: mocks.cleanup,
    launching: async () => {},
    running: async () => {},
    closed: async () => {},
  });
});
afterEach(() => vi.useRealTimers());
it("blocks a passing marker sequence when real multiline load errors are present", async () => {
  const result = await execute([
    "[13:23:49 INFO]: [Skript] Line 60: (project-0.sk)",
    "> ",
    "[13:23:49 INFO]:     Can't understand this structure: custom addon section",
    "SKTL|abc|BEGIN",
    "SKTL|abc|ASSERT|0|PASS",
    "SKTL|abc|END",
  ]);
  expect(result.status).toBe("errored");
  expect(result.runtimeDiagnostics?.[0]).toMatchObject({
    file: "x.sk",
    line: 60,
    severity: "error",
  });
});
it("fails fast at startup without inventing assertion results after a load error", async () => {
  const result = await execute([
    "[Skript] Line 4: (project-0.sk)",
    "Can't understand this structure: custom addon",
    "Done (1s)!",
  ]);
  expect(result.status).toBe("errored");
  expect(result.assertions).toEqual([]);
});
async function execute(lines: string[], code = 0) {
  const p = new PaperProvider(cfg, "storage", () => true);
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: new AbortController().signal,
  });
  await new Promise((r) => setTimeout(r, 0));
  child.stdout.write(lines.join("\n") + "\n");
  child.emit("close", code, null);
  return pending;
}
it("passes only a complete sequence with a clean exit", async () => {
  const r = await execute([
    "Done (1s)!",
    "SKTL|abc|BEGIN",
    "SKTL|abc|ASSERT|0|PASS",
    "SKTL|abc|END",
  ]);
  expect(r.status).toBe("passed");
  expect(mocks.cleanup).toHaveBeenCalledOnce();
  expect(mocks.spawn.mock.calls[0][2].shell).toBe(false);
});
it("reports failed assertions", async () =>
  expect(
    (
      await execute([
        "Done (1s)!",
        "SKTL|abc|BEGIN",
        "SKTL|abc|ASSERT|0|FAIL",
        "SKTL|abc|END",
      ])
    ).status,
  ).toBe("failed"));
it.each([
  ["SKTL|abc|BEGIN"],
  ["SKTL|other|BEGIN", "SKTL|other|END"],
  ["SKTL|abc|BEGIN", "SKTL|abc|ASSERT|0|PASS"],
])("rejects incomplete or unrelated output %#", async (...lines) => {
  await expect(execute(lines.flat())).rejects.toThrow("complete");
  expect(mocks.cleanup).toHaveBeenCalledOnce();
});
it("rejects malformed and duplicate markers", async () => {
  await expect(
    execute([
      "SKTL|abc|BEGIN",
      "SKTL|abc|ASSERT|0|PASS",
      "SKTL|abc|ASSERT|0|PASS",
    ]),
  ).rejects.toThrow("duplicate");
});
it("rejects process crashes even after result completion", async () =>
  await expect(
    execute(["SKTL|abc|BEGIN", "SKTL|abc|ASSERT|0|PASS", "SKTL|abc|END"], 1),
  ).rejects.toThrow("abnormally"));
it("treats script load errors as errors despite complete assertions", async () => {
  const r = await execute([
    "[Skript] Encountered 1 error while loading",
    "SKTL|abc|BEGIN",
    "SKTL|abc|ASSERT|0|PASS",
    "SKTL|abc|END",
  ]);
  expect(r.status).toBe("errored");
});
it("handles split marker chunks", async () => {
  const p = new PaperProvider(cfg, "storage", () => true);
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: new AbortController().signal,
  });
  await new Promise((r) => setTimeout(r, 0));
  child.stdout.write("SKTL|ab");
  child.stdout.write("c|BEGIN\nSKTL|abc|ASSERT|0|PASS\nSKTL|abc|END\n");
  child.emit("close", 0, null);
  expect((await pending).status).toBe("passed");
});
it("cancels and waits for process closure before cleanup", async () => {
  const abort = new AbortController();
  const p = new PaperProvider(cfg, "storage", () => true);
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: abort.signal,
  });
  const rejection = expect(pending).rejects.toThrow("cancelled");
  await new Promise((r) => setTimeout(r, 0));
  abort.abort();
  expect(mocks.cleanup).not.toHaveBeenCalled();
  child.emit("close", 0, null);
  await rejection;
  expect(mocks.cleanup).toHaveBeenCalledOnce();
});
it("does not dispatch the harness if cancellation occurs in the ready callback", async () => {
  const abort = new AbortController();
  const p = new PaperProvider(
    cfg,
    "storage",
    () => true,
    (line) => {
      if (line.includes("Done")) abort.abort();
    },
  );
  let input = "";
  child.stdin.on("data", (b) => (input += String(b)));
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: abort.signal,
  });
  const rejection = expect(pending).rejects.toThrow("cancelled");
  await new Promise((r) => setTimeout(r, 0));
  child.stdout.write("Done (1s)!\n");
  expect(input).toContain("stop");
  expect(input).not.toContain("sktlabc");
  child.emit("close", 0, null);
  await rejection;
});
it("contains output consumer failures and waits for closure", async () => {
  const p = new PaperProvider(
    cfg,
    "storage",
    () => true,
    () => {
      throw new Error("disk full");
    },
  );
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: new AbortController().signal,
  });
  const rejection = expect(pending).rejects.toThrow("log consumer failed");
  await new Promise((r) => setTimeout(r, 0));
  child.stdout.write("boot\n");
  expect(mocks.cleanup).not.toHaveBeenCalled();
  child.emit("close", 0, null);
  await rejection;
});
it("escalates a stuck startup stop after ten seconds and still waits for closure", async () => {
  vi.useFakeTimers();
  const p = new PaperProvider(cfg, "storage", () => true);
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: new AbortController().signal,
  });
  const rejection = expect(pending).rejects.toThrow("startup timed out");
  await vi.advanceTimersByTimeAsync(1001);
  expect(mocks.cleanup).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(10000);
  expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  expect(mocks.cleanup).not.toHaveBeenCalled();
  child.emit("close", null, "SIGKILL");
  await rejection;
  expect(mocks.cleanup).toHaveBeenCalledOnce();
});
it("bounds an unconfirmed shutdown and preserves its lifecycle record", async () => {
  vi.useFakeTimers();
  const closed = vi.fn(async () => {});
  mocks.prepare.mockResolvedValue({
    directory: "owned",
    nonce: "abc",
    command: "sktlabc",
    cleanup: mocks.cleanup,
    launching: async () => {},
    running: async () => {},
    closed,
  });
  const p = new PaperProvider(cfg, "storage", () => true);
  const pending = p.execute(test, {
    root: "root",
    read: async () => "",
    signal: new AbortController().signal,
  });
  const rejection = expect(pending).rejects.toThrow(
    "shutdown could not be confirmed",
  );
  await vi.advanceTimersByTimeAsync(16001);
  await rejection;
  expect(closed).not.toHaveBeenCalled();
});
