import { TestCase, OfflineAssertion, RuntimeAssertion } from "./model";
import { contained } from "../security/paths";
const operators = [
  "equal",
  "notEqual",
  "greater",
  "less",
  "truthy",
  "set",
  "unset",
  "size",
  "contains",
  "notContains",
];
function object(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
export function parseTest(text: string, root: string): TestCase {
  if (text.length > 1024 * 1024)
    throw new Error("Test definition exceeds 1 MiB");
  const v: unknown = JSON.parse(text);
  if (
    !object(v) ||
    v.schemaVersion !== 1 ||
    typeof v.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(v.id) ||
    typeof v.name !== "string" ||
    !v.name.trim() ||
    !["offline", "runtime"].includes(String(v.mode))
  )
    throw new Error("Invalid test identity, schemaVersion, or mode");
  const allowed = [
    "schemaVersion",
    "id",
    "name",
    "description",
    "tags",
    "mode",
    "targets",
    "assertions",
    "setup",
    "actions",
    "cleanup",
    "timeoutMs",
    "skip",
    "template",
  ];
  for (const key of Object.keys(v))
    if (!allowed.includes(key)) throw new Error("Unknown test field: " + key);
  if (v.description !== undefined && typeof v.description !== "string")
    throw new Error("description must be text");
  if (
    !Array.isArray(v.targets) ||
    v.targets.length === 0 ||
    v.targets.length > 100 ||
    v.targets.some((t) => typeof t !== "string" || !t.endsWith(".sk"))
  )
    throw new Error("targets must contain 1–100 .sk paths");
  for (const t of v.targets) contained(root, t as string);
  if (
    !Array.isArray(v.assertions) ||
    v.assertions.length === 0 ||
    v.assertions.length > 1000
  )
    throw new Error("At least one assertion required (maximum 1000)");
  for (const key of ["setup", "actions", "cleanup", "tags"]) {
    if (
      v[key] !== undefined &&
      (!Array.isArray(v[key]) ||
        (v[key] as unknown[]).some(
          (s) => typeof s !== "string" || s.includes("\n") || s.includes("\r"),
        ))
    )
      throw new Error(key + " must be an array of single-line strings");
  }
  if (
    v.timeoutMs !== undefined &&
    (!Number.isInteger(v.timeoutMs) ||
      Number(v.timeoutMs) < 100 ||
      Number(v.timeoutMs) > 600000)
  )
    throw new Error("timeoutMs must be 100–600000");
  for (const key of ["skip", "template"])
    if (v[key] !== undefined && typeof v[key] !== "boolean")
      throw new Error(key + " must be boolean");
  for (const a of v.assertions) {
    if (!object(a)) throw new Error("Assertion must be an object");
    if (v.mode === "runtime") {
      if (
        typeof a.condition !== "string" ||
        !a.condition.trim() ||
        /[\r\n]/.test(a.condition) ||
        a.condition.trim().endsWith(":") ||
        (a.message !== undefined && typeof a.message !== "string") ||
        Object.keys(a).some((k) => !["condition", "message"].includes(k))
      )
        throw new Error("Invalid runtime assertion");
    } else {
      if (
        !["diagnostic", "symbol", "source", "structure"].includes(
          String(a.kind),
        ) ||
        !operators.includes(String(a.operator)) ||
        Object.keys(a).some(
          (k) => !["kind", "operator", "expected", "rule", "name"].includes(k),
        )
      )
        throw new Error("Invalid offline assertion");
      for (const k of ["rule", "name"])
        if (a[k] !== undefined && typeof a[k] !== "string")
          throw new Error(k + " must be text");
      if (
        [
          "equal",
          "notEqual",
          "greater",
          "less",
          "size",
          "contains",
          "notContains",
        ].includes(String(a.operator)) &&
        !("expected" in a)
      )
        throw new Error("Assertion requires expected");
    }
  }
  return v as unknown as TestCase;
}
export function isOffline(
  a: OfflineAssertion | RuntimeAssertion,
): a is OfflineAssertion {
  return "kind" in a;
}
export function stableId(file: string, id: string): string {
  return file + "#" + id;
}
