import * as assert from "node:assert/strict";
import * as vscode from "vscode";
suite("SkTestLab extension host", () => {
  let api: {
    controller: vscode.TestController;
    diagnostics: vscode.DiagnosticCollection;
    testing: { latest?: { results: { status: string }[] } };
    dashboard: {
      panel?: vscode.WebviewPanel;
      onDidReady: vscode.Event<void>;
      setTheme: (theme: "auto" | "white" | "dark") => Promise<void>;
    };
  };
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension("dheaven.sktestlab");
    assert.ok(ext);
    api = await ext.activate();
  });
  test("registers every contributed command", async () => {
    const ext = vscode.extensions.getExtension("dheaven.sktestlab")!;
    const commands = await vscode.commands.getCommands(true);
    for (const c of ext.packageJSON.contributes.commands)
      assert.ok(commands.includes(c.command), c.command);
  });
  test("discovers native tests", async () => {
    await vscode.commands.executeCommand("sktestlab.discoverTests");
    assert.ok(api.controller.items.size > 0);
  });
  test("publishes diagnostics and safe code actions", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "skript",
      content: "on join",
    });
    const uri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      "broken.sk",
    );
    await vscode.workspace.fs.writeFile(uri, Buffer.from("on join"));
    const disk = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(disk);
    await vscode.commands.executeCommand("sktestlab.analyzeCurrentFile");
    assert.ok(api.diagnostics.get(uri)?.some((d) => d.code === "SK002"));
    const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
      "vscode.executeCodeActionProvider",
      uri,
      new vscode.Range(0, 0, 0, 7),
    );
    assert.ok(actions.some((a) => a.edit));
    assert.equal(doc.getText(), "on join");
  });
  test("runs an offline test in extension host", async () => {
    await vscode.commands.executeCommand("sktestlab.runAllTests");
    assert.ok(api.testing.latest);
    assert.equal(api.testing.latest.results.length, 1);
    assert.equal(api.testing.latest.results[0].status, "passed");
  });
  test("runs the offline-only command", async () => {
    await vscode.commands.executeCommand("sktestlab.runOfflineTests");
    assert.equal(api.testing.latest?.results[0].status, "passed");
  });
  test("loads the interactive dashboard under its real webview CSP and reuses the panel", async function () {
    this.timeout(20000);
    let subscription: vscode.Disposable | undefined;
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "Dashboard client did not signal ready; check CSP/resources",
            ),
          ),
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
      assert.ok(panel);
      assert.equal(panel.webview.options.enableScripts, true);
      assert.ok(panel.webview.html.includes("Test results"));
      assert.ok(panel.webview.html.includes("default-src 'none'"));
      assert.ok(panel.webview.html.includes("dashboard.css"));
      await vscode.commands.executeCommand("sktestlab.openDashboard");
      assert.equal(api.dashboard.panel, panel);
    } finally {
      subscription?.dispose();
      api.dashboard.panel?.dispose();
    }
  });
  test("persists dashboard appearance independently of the editor theme", async () => {
    try {
      await vscode.commands.executeCommand("sktestlab.openDashboard");
      await api.dashboard.setTheme("white");
      assert.ok(
        api.dashboard.panel?.webview.html.includes('data-theme="white"'),
      );
      api.dashboard.panel?.dispose();
      await vscode.commands.executeCommand("sktestlab.openDashboard");
      assert.ok(
        api.dashboard.panel?.webview.html.includes('data-theme="white"'),
      );
      await api.dashboard.setTheme("dark");
      assert.ok(
        api.dashboard.panel?.webview.html.includes('data-theme="dark"'),
      );
    } finally {
      await api.dashboard.setTheme("auto");
      api.dashboard.panel?.dispose();
    }
  });
});
