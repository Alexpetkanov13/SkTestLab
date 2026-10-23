import * as vscode from "vscode";
import path from "node:path";
import { analyze } from "../core/analyzer";
import { config, requireTrust, workspaceRoot } from "./configuration";
export async function createTest(uri?: vscode.Uri, suite = false) {
  requireTrust();
  uri ??= vscode.window.activeTextEditor?.document.uri;
  if (!uri || !uri.path.endsWith(".sk"))
    throw new Error("Open a .sk file to generate a test.");
  const root = workspaceRoot(uri);
  const doc = await vscode.workspace.openTextDocument(uri);
  const analysis = analyze(doc.getText());
  const target = path
    .relative(root.uri.fsPath, uri.fsPath)
    .split(path.sep)
    .join("/");
  const declarations = analysis.symbols.filter(
    (s) => s.kind === "function" || s.kind === "command",
  );
  const name = path.basename(uri.fsPath, ".sk");
  const choice = suite
    ? "structure"
    : await vscode.window.showQuickPick(
        [
          "Structure regression",
          ...declarations.map((s) => s.kind + ": " + s.name),
        ],
        { title: "Generate a test from " + name },
      );
  if (!choice) return;
  const structural =
    choice === "structure" || choice === "Structure regression";
  const test = {
    schemaVersion: 1,
    id: name.replace(/[^a-zA-Z0-9_-]/g, "-") + "-" + Date.now(),
    name: name + " " + choice,
    mode: structural ? "offline" : "runtime",
    targets: [target],
    ...(structural
      ? {}
      : {
          template: true,
          description:
            "Replace the false condition with an expected result and add an action invoking " +
            choice +
            ". This template has not executed project logic.",
          actions: [],
        }),
    assertions: structural
      ? [
          {
            kind: "diagnostic",
            operator: "size",
            expected: analysis.findings.length,
          },
          ...declarations.map((s) => ({
            kind: "symbol",
            name: s.name,
            operator: "contains",
            expected: s.name,
          })),
        ]
      : [
          {
            condition: "false is true",
            message: "Replace with the project behavior to verify",
          },
        ],
  };
  const save = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(
      path.join(root.uri.fsPath, name + ".sktest.json"),
    ),
    filters: { "SkTestLab test": ["sktest.json"] },
  });
  if (!save) return;
  try {
    await vscode.workspace.fs.stat(save);
    throw new Error(
      "A file already exists at the selected path. Choose a new path.",
    );
  } catch (e) {
    if (!(e instanceof vscode.FileSystemError && e.code === "FileNotFound"))
      throw e;
  }
  const edit = new vscode.WorkspaceEdit();
  edit.createFile(save, { overwrite: false });
  edit.insert(
    save,
    new vscode.Position(0, 0),
    JSON.stringify(test, null, 2) + "\n",
  );
  if (!(await vscode.workspace.applyEdit(edit)))
    throw new Error("Could not create test");
  await vscode.window.showTextDocument(save);
}
export function lenses(): vscode.Disposable {
  return vscode.languages.registerCodeLensProvider(
    { pattern: "**/*.sk" },
    {
      provideCodeLenses(document) {
        if (!config(document.uri).get("ui.showCodeLens", true)) return [];
        return analyze(document.getText())
          .symbols.filter((s) => s.kind === "function" || s.kind === "command")
          .flatMap((s) => [
            new vscode.CodeLens(new vscode.Range(s.line, 0, s.line, 0), {
              title: "Create Test",
              command: "sktestlab.createTest",
              arguments: [document.uri],
            }),
            new vscode.CodeLens(new vscode.Range(s.line, 0, s.line, 0), {
              title: "Run Related Tests",
              command: "sktestlab.runCurrentFileTests",
              arguments: [document.uri],
            }),
          ]);
      },
    },
  );
}
