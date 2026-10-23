import * as assert from "node:assert/strict";
import * as vscode from "vscode";
export async function run(): Promise<void> {
  assert.equal(
    vscode.workspace.isTrusted,
    false,
    "Test must actually run in Restricted Mode",
  );
  const extension = vscode.extensions.getExtension("dheaven.sktestlab");
  assert.ok(extension);
  const api = await extension.activate();
  await vscode.commands.executeCommand("sktestlab.discoverTests");
  assert.equal(api.testing.counts.total, 2);
  await vscode.commands.executeCommand("sktestlab.runOfflineTests");
  assert.equal(api.testing.latest.results.length, 1);
  assert.equal(api.testing.latest.results[0].status, "passed");
  await vscode.commands.executeCommand("sktestlab.runAllTests");
  const runtime = api.testing.latest.results.find(
    (r: { mode: string }) => r.mode === "runtime",
  );
  assert.equal(runtime?.status, "errored");
  assert.match(runtime.error, /Workspace Trust/);
  await vscode.commands.executeCommand("sktestlab.initializeProject");
  const root = vscode.workspace.workspaceFolders![0].uri;
  await assert.rejects(
    Promise.resolve(
      vscode.workspace.fs.stat(
        vscode.Uri.joinPath(root, ".sktestlab", "README.md"),
      ),
    ),
  );
  const document = await vscode.workspace.openTextDocument(
    vscode.Uri.joinPath(root, "sample.sk"),
  );
  await vscode.window.showTextDocument(document);
  await vscode.commands.executeCommand("sktestlab.analyzeCurrentFile");
  console.log(
    "Restricted Mode: trust=false; activation, offline checks and analysis work; runtime and initialization blocked.",
  );
}
