import {
  mkdir,
  readFile,
  rename,
  writeFile,
  readdir,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { RunRecord } from "./model";
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");
const time = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
export function validRunRecord(value: unknown): value is RunRecord {
  if (
    !object(value) ||
    value.version !== 1 ||
    typeof value.id !== "string" ||
    !/^[a-f0-9-]+$/.test(value.id) ||
    typeof value.startedAt !== "string" ||
    !Number.isFinite(Date.parse(value.startedAt)) ||
    !time(value.durationMs) ||
    !object(value.environment) ||
    !Object.values(value.environment).every((v) => typeof v === "string") ||
    !Array.isArray(value.results)
  )
    return false;
  return value.results.every(
    (r) =>
      object(r) &&
      typeof r.id === "string" &&
      typeof r.name === "string" &&
      typeof r.file === "string" &&
      ["offline", "runtime"].includes(String(r.mode)) &&
      [
        "discovered",
        "queued",
        "running",
        "passed",
        "failed",
        "errored",
        "skipped",
        "cancelled",
        "unsupported",
        "not-executed",
      ].includes(String(r.status)) &&
      time(r.durationMs) &&
      strings(r.targets) &&
      Array.isArray(r.assertions) &&
      r.assertions.every(
        (a) =>
          object(a) &&
          typeof a.passed === "boolean" &&
          typeof a.message === "string",
      ) &&
      (r.error === undefined || typeof r.error === "string") &&
      (r.log === undefined || typeof r.log === "string") &&
      (r.runtimeVersions === undefined ||
        (object(r.runtimeVersions) &&
          Object.entries(r.runtimeVersions).every(
            ([key, value]) =>
              ["minecraft", "skript", "java"].includes(key) &&
              typeof value === "string" &&
              value.length <= 100,
          ))) &&
      (r.runtimeDiagnostics === undefined ||
        (Array.isArray(r.runtimeDiagnostics) &&
          r.runtimeDiagnostics.every(
            (d) =>
              object(d) &&
              typeof d.file === "string" &&
              Number.isInteger(d.line) &&
              Number(d.line) >= 0 &&
              ["error", "warning", "unknown"].includes(String(d.severity)) &&
              typeof d.message === "string",
          ))),
  );
}
export class History {
  constructor(private root: string) {}
  async save(run: RunRecord) {
    if (!validRunRecord(run))
      throw new Error("Refusing to persist an invalid test run");
    await mkdir(this.root, { recursive: true });
    const target = path.join(this.root, run.id + ".json");
    await writeFile(target + ".tmp", JSON.stringify(run));
    await rename(target + ".tmp", target);
    const files = (await readdir(this.root))
      .filter((f) => /^[a-f0-9-]+\.json$/.test(f))
      .sort();
    if (files.length > 50) {
      const runs = await this.list();
      for (const r of runs.slice(50))
        await unlink(path.join(this.root, r.id + ".json"));
    }
  }
  async list(): Promise<RunRecord[]> {
    await mkdir(this.root, { recursive: true });
    const runs: RunRecord[] = [];
    for (const f of await readdir(this.root)) {
      if (!/^[a-f0-9-]+\.json$/.test(f)) continue;
      try {
        const r: unknown = JSON.parse(
          await readFile(path.join(this.root, f), "utf8"),
        );
        if (validRunRecord(r) && f === r.id + ".json") runs.push(r);
      } catch {
        /* A partial or corrupted history entry must not prevent discovery. */
      }
    }
    return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  async clear() {
    for (const r of await this.list())
      await unlink(path.join(this.root, r.id + ".json"));
  }
}
