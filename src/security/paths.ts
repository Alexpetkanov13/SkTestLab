import path from "node:path";
import { realpath } from "node:fs/promises";
export function contained(root: string, target: string): string {
  if (
    !target ||
    path.isAbsolute(target) ||
    /^[a-z]:/i.test(target) ||
    target.includes("\\") ||
    target.includes("\0")
  )
    throw new Error("Target must be a portable relative path");
  const resolved = path.resolve(root, target),
    relative = path.relative(path.resolve(root), resolved);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  )
    throw new Error("Path escapes project");
  return resolved;
}
export async function safeTarget(
  root: string,
  target: string,
): Promise<string> {
  const resolved = contained(root, target);
  const [base, actual] = await Promise.all([
    realpath(root),
    realpath(resolved),
  ]);
  const relative = path.relative(base, actual);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  )
    throw new Error("Symlink escapes project");
  if (!actual.toLowerCase().endsWith(".sk"))
    throw new Error("Target must be a .sk script");
  return actual;
}
export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]/g, "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
}
export function cleanLog(value: string): string {
  return value
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
}
