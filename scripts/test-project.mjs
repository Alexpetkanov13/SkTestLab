import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";

const requestedRoot = process.argv[2] ?? process.env.SKTESTLAB_PROJECT_ROOT;
if (!requestedRoot)
  throw new Error(
    "Set SKTESTLAB_PROJECT_ROOT, or run node scripts/test-project.mjs <folder>",
  );
const root = path.resolve(requestedRoot);
const initial = new Map();
async function collect(directory, relative = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", ".sktestlab"].includes(entry.name)) continue;
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory())
      await collect(path.join(directory, entry.name), rel);
    else if (
      entry.isFile() &&
      (entry.name.endsWith(".sk") || entry.name.endsWith(".sktest.json"))
    ) {
      initial.set(
        rel,
        createHash("sha256")
          .update(await readFile(path.join(root, rel)))
          .digest("hex"),
      );
    }
  }
}
await collect(root);
await mkdir(".vscode-test", { recursive: true });
const temporary = await mkdtemp(path.resolve(".vscode-test/project-smoke-"));
const snapshot = path.join(temporary, "snapshot");
await mkdir(snapshot, { recursive: true });
let count = 0;
for (const relative of initial.keys()) {
  if (!relative.endsWith(".sk") || relative.endsWith("_backup.sk")) continue;
  const target = path.join("scripts", relative).split(path.sep).join("/");
  await mkdir(path.dirname(path.join(snapshot, target)), { recursive: true });
  await copyFile(path.join(root, relative), path.join(snapshot, target));
  await writeFile(
    path.join(snapshot, `${++count}.sktest.json`),
    JSON.stringify(
      {
        schemaVersion: 1,
        id: `structure-${count}`,
        name: `Static structure: ${relative}`,
        mode: "offline",
        targets: [target],
        assertions: ["SK001", "SK002", "SK006", "SK010", "SK011"].map(
          (rule) => ({
            kind: "diagnostic",
            rule,
            operator: "size",
            expected: 0,
          }),
        ),
      },
      null,
      2,
    ),
  );
}
if (initial.has("credits.sk")) {
  await writeFile(
    path.join(snapshot, "credits-declarations.sktest.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        id: "credits-declarations",
        name: "Static credits declarations",
        mode: "offline",
        targets: ["scripts/credits.sk"],
        assertions: [
          "coreCreditsGet",
          "coreCreditsSet",
          "coreCreditsAdd",
          "coreCreditsFormat",
          "credits",
          "creditsadmin",
        ].map((name) => ({
          kind: "symbol",
          name,
          operator: "contains",
          expected: name,
        })),
      },
      null,
      2,
    ),
  );
  count++;
}
const workspace = path.join(temporary, "project.code-workspace");
const report = path.join(temporary, "report.json");
await writeFile(
  workspace,
  JSON.stringify({
    folders: [
      { path: root, name: "Original project" },
      { path: snapshot, name: "Read-only verification snapshot" },
    ],
  }),
);
console.log(
  `Prepared ${count} offline checks on local snapshots. Original files are read-only inputs.`,
);
const child = spawn(
  process.execPath,
  [
    "node_modules/@vscode/test-cli/out/bin.mjs",
    "--config",
    ".vscode-project-test.mjs",
  ],
  {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      SKTESTLAB_PROJECT_WORKSPACE: workspace,
      SKTESTLAB_PROJECT_ROOT: root,
      SKTESTLAB_PROJECT_REPORT: report,
    },
  },
);
const code = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", resolve);
});
let changed = 0;
for (const [relative, hash] of initial) {
  const current = createHash("sha256")
    .update(await readFile(path.join(root, relative)))
    .digest("hex");
  if (current !== hash) {
    changed++;
    console.error("Input changed during verification: " + relative);
  }
}
console.log(
  `Original input hashes verified: ${initial.size - changed}/${initial.size}. Report: ${report}`,
);
process.exitCode = code || changed ? 1 : 0;
