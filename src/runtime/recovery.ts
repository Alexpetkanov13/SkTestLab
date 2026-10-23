import { hostname } from "node:os";
import {
  lstat,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface RuntimeLease {
  version: 1;
  nonce: string;
  host: string;
  ownerPid: number;
  serverPid?: number;
  phase: "preparing" | "launching" | "running" | "closed";
  createdAt: string;
}
export interface RecoveryEntry {
  directory: string;
  state: "recoverable" | "active" | "unknown";
  reason: string;
  lease?: RuntimeLease;
}
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
function validLease(value: unknown): value is RuntimeLease {
  if (!value || typeof value !== "object") return false;
  const lease = value as RuntimeLease;
  const pid = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
  return (
    lease.version === 1 &&
    /^[a-f0-9]{32}$/.test(lease.nonce) &&
    typeof lease.host === "string" &&
    pid(lease.ownerPid) &&
    (lease.serverPid === undefined || pid(lease.serverPid)) &&
    ["preparing", "launching", "running", "closed"].includes(lease.phase) &&
    typeof lease.createdAt === "string" &&
    Number.isFinite(Date.parse(lease.createdAt)) &&
    (lease.phase !== "running" || lease.serverPid !== undefined)
  );
}
export async function writeLease(
  directory: string,
  lease: RuntimeLease,
): Promise<void> {
  if (!validLease(lease)) throw new Error("Invalid runtime ownership record");
  const file = path.join(directory, ".sktestlab-runtime.json");
  await writeFile(file + ".tmp", JSON.stringify(lease), { flag: "w" });
  await rename(file + ".tmp", file);
}
export function newLease(nonce: string): RuntimeLease {
  return {
    version: 1,
    nonce,
    host: hostname(),
    ownerPid: process.pid,
    phase: "preparing",
    createdAt: new Date().toISOString(),
  };
}
export async function inspectEnvironment(
  storage: string,
  directory: string,
): Promise<RecoveryEntry> {
  const unknown = (reason: string): RecoveryEntry => ({
    directory,
    state: "unknown",
    reason,
  });
  try {
    const base = await realpath(storage);
    if (!/^sktestlab-[\w-]+$/.test(path.basename(directory)))
      return unknown("Unrecognized environment name");
    if (path.resolve(path.dirname(directory)) !== path.resolve(storage))
      return unknown("Not a direct storage child");
    const entry = await lstat(directory);
    if (!entry.isDirectory() || entry.isSymbolicLink())
      return unknown("Linked or non-directory environment");
    const actual = await realpath(directory);
    if (path.dirname(actual) !== base)
      return unknown("Environment resolves outside storage");
    for (const name of [".sktestlab-owner", ".sktestlab-runtime.json"]) {
      const file = await lstat(path.join(directory, name));
      if (!file.isFile() || file.isSymbolicLink() || file.size > 16384)
        return unknown("Invalid ownership file");
    }
    const lease: unknown = JSON.parse(
      await readFile(path.join(directory, ".sktestlab-runtime.json"), "utf8"),
    );
    if (
      !validLease(lease) ||
      (await readFile(path.join(directory, ".sktestlab-owner"), "utf8")) !==
        lease.nonce
    )
      return unknown("Ownership record missing, corrupt or mismatched");
    if (lease.host !== hostname())
      return { ...unknown("Environment belongs to another host"), lease };
    if (lease.serverPid && processAlive(lease.serverPid))
      return {
        directory,
        state: "active",
        reason: "Server PID is still present (or cannot be checked)",
        lease,
      };
    if (lease.phase === "closed")
      return {
        directory,
        state: "recoverable",
        reason: "Server closure was recorded",
        lease,
      };
    if (processAlive(lease.ownerPid))
      return {
        directory,
        state: "active",
        reason: "Owning editor process is still present",
        lease,
      };
    if (lease.phase === "launching")
      return {
        ...unknown(
          "Launch was interrupted before its server PID was recorded; inspect manually",
        ),
        lease,
      };
    return {
      directory,
      state: "recoverable",
      reason:
        lease.phase === "preparing"
          ? "Preparation was interrupted before launch"
          : "Owner and recorded server processes are absent",
      lease,
    };
  } catch {
    return unknown(
      "Legacy, missing or unreadable ownership evidence; inspect manually",
    );
  }
}
export async function listEnvironments(
  storage: string,
): Promise<RecoveryEntry[]> {
  let names: string[];
  try {
    names = await readdir(storage);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    names
      .filter((name) => name.startsWith("sktestlab-"))
      .map((name) => inspectEnvironment(storage, path.join(storage, name))),
  );
}
/** Never kills a PID. Revalidates before and after claiming a directory. */
export async function recoverEnvironment(
  storage: string,
  directory: string,
  nonce: string,
): Promise<void> {
  const before = await inspectEnvironment(storage, directory);
  if (before.state !== "recoverable" || before.lease?.nonce !== nonce)
    throw new Error("Refusing recovery: " + before.reason);
  const target = path.join(
    await realpath(storage),
    "sktestlab-recovery-" + randomUUID(),
  );
  await rename(directory, target);
  const claimed = await inspectEnvironment(await realpath(storage), target);
  if (claimed.state !== "recoverable" || claimed.lease?.nonce !== nonce)
    throw new Error(
      "Recovery claim changed; retained for inspection at " + target,
    );
  await rm(target, { recursive: true, force: false });
}
