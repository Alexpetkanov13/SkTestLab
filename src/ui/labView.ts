import * as vscode from "vscode";
import { Testing } from "../extension/testing";

export class LabView
  implements vscode.TreeDataProvider<vscode.TreeItem>, vscode.Disposable
{
  private changed = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this.changed.event;
  private subscription: vscode.Disposable;
  constructor(private testing: Testing) {
    this.subscription = testing.onDidChange(() => this.changed.fire(undefined));
  }
  getTreeItem(item: vscode.TreeItem) {
    return item;
  }
  getChildren() {
    const counts = this.testing.counts;
    const item = (
      label: string,
      command: string,
      icon: string,
      description?: string,
    ) => {
      const node = new vscode.TreeItem(label);
      node.command = { command, title: label };
      node.iconPath = new vscode.ThemeIcon(icon);
      node.description = description;
      return node;
    };
    return [
      item("Open dashboard", "sktestlab.openDashboard", "dashboard"),
      item(
        "Run all tests",
        "sktestlab.runAllTests",
        "play",
        this.testing.progress ? "Running…" : counts.total + " discovered",
      ),
      item(
        "Run offline tests",
        "sktestlab.runOfflineTests",
        "pass",
        counts.offline + " static checks",
      ),
      item("Analyze workspace", "sktestlab.analyzeWorkspace", "code"),
      item("Configure runtime", "sktestlab.configureRuntime", "server"),
      item("Open test logs", "sktestlab.openTestLogs", "output"),
    ];
  }
  dispose() {
    this.subscription.dispose();
    this.changed.dispose();
  }
}
