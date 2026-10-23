import { it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  prepareEnvironment,
  RuntimeConfig,
} from "../../src/runtime/environment";
import { TestCase } from "../../src/testing/model";

it("imports dependency caches but excludes worlds, plugin data and linked directories", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sktl-cache-"));
  try {
    const original = path.join(root, "server");
    await mkdir(path.join(original, "cache"), { recursive: true });
    await mkdir(path.join(original, "world"), { recursive: true });
    await mkdir(path.join(original, "plugins"), { recursive: true });
    await mkdir(path.join(root, "outside"), { recursive: true });
    await writeFile(path.join(root, "script.sk"), "on load:\n    stop");
    await writeFile(path.join(root, "input.jar"), "fixture");
    await writeFile(
      path.join(original, "cache", "dependency.jar"),
      "dependency",
    );
    await writeFile(path.join(original, "world", "level.dat"), "private world");
    await writeFile(
      path.join(original, "plugins", "variables.csv"),
      "private variables",
    );
    await writeFile(path.join(root, "outside", "escape.jar"), "outside");
    await symlink(
      path.join(root, "outside"),
      path.join(original, "cache", "linked"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const config: RuntimeConfig = {
      javaPath: "java",
      paperJarPath: path.join(root, "input.jar"),
      skriptJarPath: path.join(root, "input.jar"),
      addonJarPaths: [],
      memoryMb: 1024,
      startupTimeoutMs: 10000,
      keepEnvironment: false,
      eulaAccepted: true,
      dependencyCachePath: original,
    };
    const test: TestCase = {
      schemaVersion: 1,
      id: "cache",
      name: "Cache isolation",
      mode: "runtime",
      targets: ["script.sk"],
      assertions: [{ condition: "true is true" }],
    };
    const env = await prepareEnvironment(
      path.join(root, "storage"),
      root,
      test,
      config,
    );
    expect(
      await readFile(
        path.join(env.directory, "cache", "dependency.jar"),
        "utf8",
      ),
    ).toBe("dependency");
    await expect(
      readFile(path.join(env.directory, "world", "level.dat")),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(env.directory, "plugins", "variables.csv")),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(env.directory, "cache", "linked", "escape.jar")),
    ).rejects.toThrow();
    expect(
      await readFile(
        path.join(env.directory, "plugins", "bStats", "config.yml"),
        "utf8",
      ),
    ).toContain("enabled: false");
    await env.cleanup();
    expect(
      await readFile(path.join(original, "world", "level.dat"), "utf8"),
    ).toBe("private world");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
