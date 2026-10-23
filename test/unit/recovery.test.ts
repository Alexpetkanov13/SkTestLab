import { it, expect, afterEach } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  newLease,
  writeLease,
  inspectEnvironment,
  recoverEnvironment,
  listEnvironments,
} from "../../src/runtime/recovery";
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const storage = await mkdtemp(path.join(tmpdir(), "sktl-recovery-"));
  roots.push(storage);
  const directory = path.join(storage, "sktestlab-fixture");
  await mkdir(directory);
  const lease = newLease("a".repeat(32));
  await writeFile(path.join(directory, ".sktestlab-owner"), lease.nonce);
  await writeLease(directory, lease);
  return { storage, directory, lease };
}
it("protects a live preparing owner", async () => {
  const f = await fixture();
  expect((await inspectEnvironment(f.storage, f.directory)).state).toBe(
    "active",
  );
  await expect(
    recoverEnvironment(f.storage, f.directory, f.lease.nonce),
  ).rejects.toThrow("Refusing");
});
it("protects a live server even when the lease says closed", async () => {
  const f = await fixture();
  f.lease.phase = "closed";
  f.lease.serverPid = process.pid;
  await writeLease(f.directory, f.lease);
  expect((await inspectEnvironment(f.storage, f.directory)).state).toBe(
    "active",
  );
});
it("removes a closed environment after validating its nonce", async () => {
  const f = await fixture();
  f.lease.phase = "closed";
  await writeLease(f.directory, f.lease);
  await expect(
    recoverEnvironment(f.storage, f.directory, "b".repeat(32)),
  ).rejects.toThrow("Refusing");
  await recoverEnvironment(f.storage, f.directory, f.lease.nonce);
  expect(await listEnvironments(f.storage)).toEqual([]);
});
it.each(["launching", "running"] as const)(
  "rechecks a %s lease changed after discovery",
  async (phase) => {
    const f = await fixture();
    f.lease.phase = "closed";
    await writeLease(f.directory, f.lease);
    expect((await inspectEnvironment(f.storage, f.directory)).state).toBe(
      "recoverable",
    );
    f.lease.phase = phase;
    if (phase === "running") f.lease.serverPid = process.pid;
    await writeLease(f.directory, f.lease);
    await expect(
      recoverEnvironment(f.storage, f.directory, f.lease.nonce),
    ).rejects.toThrow("Refusing");
  },
);
it("never trusts ownership from a different host", async () => {
  const f = await fixture();
  f.lease.host = hostname() + "-other";
  f.lease.phase = "closed";
  await writeLease(f.directory, f.lease);
  expect((await inspectEnvironment(f.storage, f.directory)).state).toBe(
    "unknown",
  );
});
it.each(["legacy", "corrupt", "mismatch"])(
  "keeps %s ownership evidence for manual inspection",
  async (kind) => {
    const f = await fixture();
    if (kind === "legacy")
      await rm(path.join(f.directory, ".sktestlab-runtime.json"));
    else if (kind === "corrupt")
      await writeFile(path.join(f.directory, ".sktestlab-runtime.json"), "{}");
    else
      await writeFile(
        path.join(f.directory, ".sktestlab-owner"),
        "b".repeat(32),
      );
    expect((await inspectEnvironment(f.storage, f.directory)).state).toBe(
      "unknown",
    );
    await expect(
      recoverEnvironment(f.storage, f.directory, f.lease.nonce),
    ).rejects.toThrow();
  },
);
it("rejects a directory link while preserving its outside target", async () => {
  const f = await fixture();
  const outside = await mkdtemp(path.join(tmpdir(), "sktl-outside-"));
  roots.push(outside);
  await writeFile(path.join(outside, "sentinel"), "keep");
  const link = path.join(f.storage, "sktestlab-link");
  await symlink(
    outside,
    link,
    process.platform === "win32" ? "junction" : "dir",
  );
  expect((await inspectEnvironment(f.storage, link)).state).toBe("unknown");
  await expect(
    recoverEnvironment(f.storage, link, f.lease.nonce),
  ).rejects.toThrow();
  expect(await readFile(path.join(outside, "sentinel"), "utf8")).toBe("keep");
});
it("ignores unrelated directories and missing storage", async () => {
  const f = await fixture();
  await mkdir(path.join(f.storage, "my-world"));
  expect((await listEnvironments(f.storage)).length).toBe(1);
  expect(await listEnvironments(path.join(f.storage, "absent"))).toEqual([]);
  expect(
    (await inspectEnvironment(f.storage, path.join(f.directory, "nested")))
      .state,
  ).toBe("unknown");
});
it.each(["preparing", "launching", "running"] as const)(
  "classifies abandoned %s state conservatively",
  async (phase) => {
    const f = await fixture();
    const dead = spawn(process.execPath, ["-e", "process.exit(0)"], {
      windowsHide: true,
    });
    const pid = dead.pid!;
    await new Promise<void>((resolve, reject) => {
      dead.on("close", () => resolve());
      dead.on("error", reject);
    });
    f.lease.ownerPid = pid;
    f.lease.phase = phase;
    if (phase === "running") f.lease.serverPid = pid;
    await writeLease(f.directory, f.lease);
    expect((await inspectEnvironment(f.storage, f.directory)).state).toBe(
      phase === "launching" ? "unknown" : "recoverable",
    );
  },
);
