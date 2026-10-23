import * as assert from "node:assert/strict";
import * as vscode from "vscode";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
interface SavedRun {
  id: string;
  results: { name: string }[];
}

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("dheaven.sktestlab");
  assert.ok(extension);
  assert.equal(
    extension.packageJSON.version,
    process.env.SKTESTLAB_ACCEPT_VERSION,
  );
  const installedRelative = path.relative(
    process.env.SKTESTLAB_ACCEPT_EXTENSIONS!,
    extension.extensionPath,
  );
  assert.ok(
    installedRelative &&
      !installedRelative.startsWith("..") &&
      !path.isAbsolute(installedRelative),
  );
  const api = await extension.activate();
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const records: SavedRun[] = [];
  if (process.env.SKTESTLAB_ACCEPT_STAGE === "upgrade") {
    const old = JSON.parse(
      await readFile(process.env.SKTESTLAB_ACCEPT_PREVIOUS!, "utf8"),
    ) as { records: SavedRun[] };
    await vscode.commands.executeCommand("sktestlab.openDashboard");
    for (const record of old.records)
      assert.ok(
        api.dashboard.panel.webview.html.includes(
          `data-select-run="${record.id}"`,
        ),
        "Upgrade lost history record " + record.id,
      );
  }
  await vscode.commands.executeCommand("sktestlab.runOfflineTests");
  assert.equal(api.testing.latest.results.length, 1);
  assert.equal(api.testing.latest.results[0].status, "passed");
  records.push(api.testing.latest);
  if (process.env.SKTESTLAB_ACCEPT_RUNTIME === "true") {
    await vscode.commands.executeCommand("sktestlab.discoverTests");
    const items: vscode.TestItem[] = [];
    const visit = (item: vscode.TestItem) => {
      if (!item.children.size && item.description === "runtime")
        items.push(item);
      item.children.forEach(visit);
    };
    api.controller.items.forEach(visit);
    assert.equal(items.length, 1);
    await api.testing.run(new vscode.TestRunRequest(items));
    assert.equal(
      api.testing.latest.results[0].status,
      "passed",
      api.testing.latest.results[0].error,
    );
    assert.equal(api.testing.latest.results[0].assertions.length, 7);
    records.push(api.testing.latest);
  }
  const original = await readFile(
    path.join(root, "offline.sktest.json"),
    "utf8",
  );
  const failed = JSON.parse(original);
  failed.id = "acceptance-intentional-failure";
  failed.name = "Intentional acceptance failure";
  failed.assertions = [
    {
      kind: "symbol",
      operator: "contains",
      expected: "absentAcceptanceFunction",
    },
  ];
  const failureFile = path.join(root, "acceptance-failure.sktest.json");
  await writeFile(failureFile, JSON.stringify(failed));
  try {
    await vscode.commands.executeCommand("sktestlab.runOfflineTests");
    const result = api.testing.latest.results.find(
      (r: { id: string }) => r.id === failed.id,
    );
    assert.equal(result?.status, "failed");
    records.push(api.testing.latest);
    await vscode.commands.executeCommand("sktestlab.openDashboard");
    const html = api.dashboard.panel.webview.html as string;
    assert.ok(html.includes("absentAcceptanceFunction"));
    assert.ok(html.includes("EXPECTED"));
    assert.ok(html.includes("RECEIVED"));
    for (const theme of [
      "Default Dark Modern",
      "Default Light Modern",
      "Default High Contrast",
      "Default High Contrast Light",
    ]) {
      await vscode.workspace
        .getConfiguration("workbench")
        .update("colorTheme", theme, vscode.ConfigurationTarget.Global);
      const kind =
        theme === "Default Light Modern"
          ? vscode.ColorThemeKind.Light
          : theme === "Default Dark Modern"
            ? vscode.ColorThemeKind.Dark
            : theme === "Default High Contrast"
              ? vscode.ColorThemeKind.HighContrast
              : vscode.ColorThemeKind.HighContrastLight;
      for (
        let i = 0;
        i < 40 && vscode.window.activeColorTheme.kind !== kind;
        i++
      )
        await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(
        vscode.window.activeColorTheme.kind,
        kind,
        "Theme did not activate: " + theme,
      );
    }
  } finally {
    await vscode.workspace.fs.delete(vscode.Uri.file(failureFile));
    api.dashboard.panel?.dispose();
  }
  await writeFile(
    process.env.SKTESTLAB_ACCEPT_OUTPUT!,
    JSON.stringify(
      {
        version: extension.packageJSON.version,
        installedPath: extension.extensionPath,
        records,
      },
      null,
      2,
    ),
  );
  console.log(
    "Installed extension: offline/runtime/failure evidence and theme switches passed",
  );
}
