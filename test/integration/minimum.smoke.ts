import * as assert from "node:assert/strict";
import * as vscode from "vscode";
// No test-framework dependency: minimum VS Code has an older embedded Node.
export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("dheaven.sktestlab");
  assert.ok(extension);
  const api = await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  for (const command of extension.packageJSON.contributes.commands)
    assert.ok(commands.includes(command.command));
  await vscode.commands.executeCommand("sktestlab.discoverTests");
  assert.ok(api.controller.items.size);
  const uri = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    "broken.sk",
  );
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  await vscode.commands.executeCommand("sktestlab.analyzeCurrentFile");
  assert.ok(api.diagnostics.get(uri)?.length);
  await vscode.commands.executeCommand("sktestlab.runOfflineTests");
  assert.equal(api.testing.latest.results[0].status, "passed");
  let subscription: vscode.Disposable | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Minimum-engine dashboard did not signal ready")),
      15000,
    );
    subscription = api.dashboard.onDidReady(() => {
      clearTimeout(timer);
      resolve();
    });
  });
  try {
    await vscode.commands.executeCommand("sktestlab.openDashboard");
    await ready;
    const panel = api.dashboard.panel;
    assert.ok(panel.webview.html.includes("Run insights"));
    await vscode.commands.executeCommand("sktestlab.openDashboard");
    assert.equal(api.dashboard.panel, panel);
  } finally {
    subscription?.dispose();
    api.dashboard.panel?.dispose();
  }
  console.log(
    "Minimum engine: activation/commands, discovery, diagnostics, offline execution and live dashboard/panel reuse passed on VS Code " +
      vscode.version,
  );
}
