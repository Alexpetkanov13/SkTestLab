import { it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { History, validRunRecord } from "../../src/testing/history";
import { RunRecord } from "../../src/testing/model";
const run: RunRecord = {
  version: 1,
  id: "abc",
  startedAt: "2026-10-23T10:00:00Z",
  durationMs: 0,
  environment: {},
  results: [],
};
it("rejects malformed result objects before they reach the dashboard", () => {
  expect(validRunRecord({ ...run, results: [{ status: "passed" }] })).toBe(
    false,
  );
  expect(validRunRecord({ ...run, startedAt: "invalid" })).toBe(false);
  expect(validRunRecord({ ...run, id: "../escape" })).toBe(false);
  expect(validRunRecord(run)).toBe(true);
});
it("skips corrupted and filename-mismatched history entries", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sktl-history-check-"));
  try {
    await writeFile(
      path.join(root, "abc.json"),
      JSON.stringify({ ...run, results: [{}] }),
    );
    await writeFile(path.join(root, "def.json"), JSON.stringify(run));
    expect(await new History(root).list()).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
it("refuses to write an invalid history path", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sktl-history-write-"));
  try {
    await expect(
      new History(root).save({ ...run, id: "../escape" }),
    ).rejects.toThrow("invalid");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
