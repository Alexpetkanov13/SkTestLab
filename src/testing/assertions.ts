import { isDeepStrictEqual } from "node:util";
import { JsonValue, Operator } from "./model";
export function assertValue(
  actual: JsonValue | undefined,
  operator: Operator,
  expected?: JsonValue,
): boolean {
  switch (operator) {
    case "equal":
      return isDeepStrictEqual(actual, expected);
    case "notEqual":
      return !isDeepStrictEqual(actual, expected);
    case "greater":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );
    case "less":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );
    case "truthy":
      return Boolean(actual);
    case "set":
      return actual !== undefined && actual !== null;
    case "unset":
      return actual === undefined || actual === null;
    case "size":
      return (
        (Array.isArray(actual) || typeof actual === "string") &&
        actual.length === expected
      );
    case "contains":
      return typeof actual === "string" && typeof expected === "string"
        ? actual.includes(expected)
        : Array.isArray(actual) &&
            actual.some((v) => isDeepStrictEqual(v, expected));
    case "notContains":
      return (
        (typeof actual === "string" || Array.isArray(actual)) &&
        !assertValue(actual, "contains", expected)
      );
  }
}
