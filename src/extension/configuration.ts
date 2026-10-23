import * as vscode from "vscode";
import { RuntimeConfig } from "../runtime/environment";
export function config(uri?: vscode.Uri) {
  return vscode.workspace.getConfiguration("sktestlab", uri);
}
export function runtimeConfig(uri?: vscode.Uri): RuntimeConfig {
  const c = config(uri);
  return {
    javaPath: c.get("runtime.javaPath", "java"),
    paperJarPath: c.get("runtime.paperJarPath", ""),
    skriptJarPath: c.get("runtime.skriptJarPath", ""),
    addonJarPaths: c.get("runtime.addonJarPaths", []),
    memoryMb: c.get("runtime.memoryMb", 2048),
    startupTimeoutMs: c.get("runtime.startupTimeoutMs", 180000),
    keepEnvironment: c.get("runtime.keepEnvironment", false),
    eulaAccepted: c.get("runtime.eulaAccepted", false),
    dependencyCachePath: c.get("runtime.dependencyCachePath", ""),
  };
}
export function requireTrust() {
  if (!vscode.workspace.isTrusted)
    throw new Error(
      "This action requires a trusted workspace. Review the project before granting trust.",
    );
}
export function workspaceRoot(uri?: vscode.Uri) {
  const f = uri
    ? vscode.workspace.getWorkspaceFolder(uri)
    : vscode.workspace.workspaceFolders?.[0];
  if (!f || f.uri.scheme !== "file")
    throw new Error("Open a local filesystem workspace folder first.");
  return f;
}
