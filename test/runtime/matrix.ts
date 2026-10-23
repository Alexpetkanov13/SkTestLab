import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { PaperProvider } from "../../src/providers/paper";
import { RuntimeConfig } from "../../src/runtime/environment";
import { parseTest } from "../../src/testing/discovery";
import { runTests } from "../../src/testing/runner";
import { safeTarget, contained } from "../../src/security/paths";

// Explicit local configurations; never fetches or substitutes server/plugin JARs.
async function main() {
  const file = process.env.SKTESTLAB_MATRIX_FILE;
  if (!file)
    throw new Error(
      "Set SKTESTLAB_MATRIX_FILE to your matrix JSON file. See docs/compatibility.md.",
    );
  const matrix = JSON.parse(await readFile(file, "utf8")) as {
    root: string;
    tests: string[];
    variants: { name: string; config: RuntimeConfig }[];
  };
  if (
    !path.isAbsolute(matrix.root) ||
    !Array.isArray(matrix.tests) ||
    !matrix.tests.length ||
    !Array.isArray(matrix.variants) ||
    !matrix.variants.length
  )
    throw new Error(
      "Matrix requires an absolute root, nonempty tests and variants arrays",
    );
  await mkdir(".vscode-test", { recursive: true });
  const output = await mkdtemp(path.resolve(".vscode-test/matrix-"));
  const selection = await Promise.all(
    matrix.tests.map(async (target) => {
      if (!target.endsWith(".sktest.json"))
        throw new Error("Select .sktest.json test definitions");
      const testFile = contained(matrix.root, target);
      const test = parseTest(await readFile(testFile, "utf8"), matrix.root);
      if (test.mode !== "runtime")
        throw new Error("Matrix tests must use runtime mode");
      return { file: testFile, test };
    }),
  );
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort());
  const evidence = [];
  for (const [index, variant] of matrix.variants.entries()) {
    if (abort.signal.aborted) break;
    const jars = await Promise.all(
      [
        variant.config.paperJarPath,
        variant.config.skriptJarPath,
        ...variant.config.addonJarPaths,
      ].map(async (jar) => ({
        path: jar,
        sha256: createHash("sha256")
          .update(await readFile(jar))
          .digest("hex"),
      })),
    );
    const record = await runTests(
      selection,
      [
        new PaperProvider(
          { ...variant.config, keepEnvironment: false },
          path.join(output, "environment-" + index),
          () => true,
        ),
      ],
      {
        root: matrix.root,
        signal: abort.signal,
        read: async (target) =>
          readFile(await safeTarget(matrix.root, target), "utf8"),
      },
    );
    evidence.push({ name: variant.name, jars, record });
    await writeFile(
      path.join(output, "results.json"),
      JSON.stringify(evidence, null, 2),
    );
    console.log(
      variant.name + ": " + record.results.map((r) => r.status).join(", "),
    );
    if (record.results.some((r) => r.status !== "passed")) process.exitCode = 1;
  }
  if (abort.signal.aborted) process.exitCode = 1;
  console.log("Matrix evidence: " + output);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
