import { describe, it, expect } from "vitest";
import {
  mkdtemp,
  writeFile,
  mkdir,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { marker, harness } from "../../src/runtime/protocol";
import {
  prepareEnvironment,
  RuntimeConfig,
  validateRuntime,
} from "../../src/runtime/environment";
import {
  contained,
  safeTarget,
  escapeHtml,
  cleanLog,
} from "../../src/security/paths";
import { PaperProvider } from "../../src/providers/paper";
import { TestCase } from "../../src/testing/model";
const test: TestCase = {
  schemaVersion: 1,
  id: "runtime",
  name: "Runtime",
  mode: "runtime",
  targets: ["script.sk"],
  actions: ["add 1 to {test}"],
  assertions: [{ condition: "{test} is 1", message: "Balance" }],
  cleanup: ["delete {test}"],
};
const cfg: RuntimeConfig = {
  javaPath: "java",
  paperJarPath: "",
  skriptJarPath: "",
  addonJarPaths: [],
  memoryMb: 1024,
  startupTimeoutMs: 10000,
  keepEnvironment: false,
  eulaAccepted: false,
};
describe("protocol", () => {
  it("accepts only correlated bounded markers", () => {
    expect(marker("[Skript] SKTL|abc|BEGIN", "abc", 1)).toEqual({
      kind: "BEGIN",
    });
    expect(marker("SKTL|other|END", "abc", 1)).toBeUndefined();
    expect(marker("SKTL|abc|ASSERT|0|PASS", "abc", 1)).toEqual({
      kind: "ASSERT",
      index: 0,
      passed: true,
    });
    expect(() => marker("SKTL|abc|ASSERT|1|PASS", "abc", 1)).toThrow();
    expect(() => marker("SKTL|abc|garbage", "abc", 1)).toThrow();
  });
  it("generates standard console commands with completion after cleanup", () => {
    const s = harness(test, "abc");
    expect(s).toContain("executable by: console");
    expect(s).toContain("if {test} is 1:");
    expect(s.indexOf("delete {test}")).toBeLessThan(s.indexOf("SKTL|abc|END"));
    expect(s).not.toContain('test "');
  });
});
describe("runtime validation and isolation", () => {
  it("requires EULA acceptance", async () =>
    await expect(validateRuntime(cfg)).rejects.toThrow("EULA"));
  it("rejects invalid memory and missing JARs", async () => {
    await expect(
      validateRuntime({ ...cfg, eulaAccepted: true, memoryMb: 1 }),
    ).rejects.toThrow("memory");
    await expect(
      validateRuntime({ ...cfg, eulaAccepted: true }),
    ).rejects.toThrow("JAR");
  });
  it("rejects untrusted workspace before spawning Java", async () => {
    const p = new PaperProvider(cfg, "unused", () => false);
    await expect(
      p.execute(test, {
        root: ".",
        read: async () => "",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Trust");
  });
  it("copies only requested inputs and cleans owned environment", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "sktl-env-"));
    try {
      await writeFile(path.join(base, "script.sk"), "function f():\n    stop");
      await writeFile(path.join(base, "paper.jar"), "fake fixture");
      await writeFile(path.join(base, "skript.jar"), "fake fixture");
      const c = {
        ...cfg,
        paperJarPath: path.join(base, "paper.jar"),
        skriptJarPath: path.join(base, "skript.jar"),
      };
      const env = await prepareEnvironment(
        path.join(base, "storage"),
        base,
        test,
        c,
      );
      expect(
        await readFile(path.join(env.directory, "server.properties"), "utf8"),
      ).toContain("server-ip=127.0.0.1");
      expect(
        await readFile(
          path.join(env.directory, "plugins/Skript/scripts/project-0.sk"),
          "utf8",
        ),
      ).toContain("function f");
      await env.cleanup();
      await expect(
        readFile(path.join(env.directory, ".sktestlab-owner")),
      ).rejects.toThrow();
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
  it("refuses cleanup when ownership token changes", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "sktl-owner-"));
    try {
      await writeFile(path.join(base, "script.sk"), "on load:\n    stop");
      await writeFile(path.join(base, "a.jar"), "fixture");
      const env = await prepareEnvironment(
        path.join(base, "storage"),
        base,
        test,
        {
          ...cfg,
          paperJarPath: path.join(base, "a.jar"),
          skriptJarPath: path.join(base, "a.jar"),
        },
      );
      await writeFile(path.join(env.directory, ".sktestlab-owner"), "other");
      await expect(env.cleanup()).rejects.toThrow("ownership");
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
describe("security boundaries", () => {
  it.each([
    "../escape.sk",
    "/absolute.sk",
    "C:/windows.sk",
    "nested/../../escape.sk",
    "..\\escape.sk",
  ])("rejects unsafe target %s", (t) =>
    expect(() => contained(process.cwd(), t)).toThrow(),
  );
  it("escapes reports and strips terminal sequences", () => {
    expect(escapeHtml('<script>"&')).toBe("&lt;script&gt;&quot;&amp;");
    expect(cleanLog("\x1b[31mhello\x00")).toBe("hello");
  });
  it("rejects a symlink outside the root", async () => {
    const base = await mkdtemp(path.join(os.tmpdir(), "sktl-link-"));
    try {
      await mkdir(path.join(base, "root"));
      await mkdir(path.join(base, "outside"));
      await writeFile(path.join(base, "outside", "x.sk"), "stop");
      await symlink(
        path.join(base, "outside"),
        path.join(base, "root", "link"),
        process.platform === "win32" ? "junction" : "dir",
      );
      await expect(
        safeTarget(path.join(base, "root"), "link/x.sk"),
      ).rejects.toThrow("Symlink");
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
