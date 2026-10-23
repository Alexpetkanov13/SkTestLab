import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(await readFile("package.json", "utf8"));
const bundle = path.resolve(
  `release/${manifest.version}/sktestlab-${manifest.version}-download.zip`,
);
await mkdir(".vscode-test", { recursive: true });
const root = await mkdtemp(path.resolve(".vscode-test/source-release-"));
async function run(command, args, cwd = process.cwd()) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(command + " exited " + code)),
    );
  });
}
await run("python", [
  "scripts/audit-release.py",
  bundle,
  path.join(root, "audit.json"),
]);
await run("python", [
  "scripts/extract-download.py",
  bundle,
  path.join(root, "download"),
  "--source",
]);
const source = path.join(root, "download/sktestlab-source");
const npm = process.env.npm_execpath;
if (!npm) throw new Error("Run through npm run test:source-release");
await run(process.execPath, [npm, "ci", "--ignore-scripts"], source);
for (const command of ["check", "lint", "test", "build"])
  await run(process.execPath, [npm, "run", command], source);
// Compare emitted JS/maps with the actual packaged VSIX, not the working tree.
await run("python", [
  "-c",
  "import hashlib,json,pathlib,sys,zipfile; root=pathlib.Path(sys.argv[1]); v=zipfile.ZipFile(next((root/'download').glob('*.vsix'))); names=['extension.js','extension.js.map','cli.js','cli.js.map']; checks={n:hashlib.sha256((root/'download/sktestlab-source/dist'/n).read_bytes()).hexdigest()==hashlib.sha256(v.read('extension/dist/'+n)).hexdigest() for n in names}; print(json.dumps(checks)); (root/'bundle-comparison.json').write_text(json.dumps(checks)); sys.exit(0 if all(checks.values()) else 1)",
  root,
]);
await writeFile(
  path.join(root, "evidence.json"),
  JSON.stringify(
    {
      version: manifest.version,
      bundle,
      cleanSourceBuild: true,
      emittedFilesMatchVsix: true,
      completedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log("Clean-source evidence: " + root);
