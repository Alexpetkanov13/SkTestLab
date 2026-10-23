import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseTest } from "./testing/discovery";
import { runTests } from "./testing/runner";
import { OfflineProvider } from "./providers/offline";
import { safeTarget } from "./security/paths";
import { report } from "./reports/reports";
async function main() {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith("--"));
  if (!files.length)
    throw new Error(
      "Usage: node dist/cli.js path.sktest.json [...] [--junit=report.xml]",
    );
  const root = process.cwd();
  const selection = await Promise.all(
    files.map(async (f) => ({
      file: path.resolve(f),
      test: parseTest(await readFile(f, "utf8"), root),
    })),
  );
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort());
  const run = await runTests(selection, [new OfflineProvider()], {
    root,
    signal: abort.signal,
    read: async (t) => readFile(await safeTarget(root, t), "utf8"),
  });
  process.stdout.write(report(run, "json") + "\n");
  const junit = args.find((a) => a.startsWith("--junit="));
  if (junit) await writeFile(junit.slice(8), report(run, "junit"));
  if (run.results.some((r) => r.status !== "passed")) process.exitCode = 1;
}
main().catch((e) => {
  process.stderr.write(String(e) + "\n");
  process.exitCode = 2;
});
