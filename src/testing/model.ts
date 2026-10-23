export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Operator =
  | "equal"
  | "notEqual"
  | "greater"
  | "less"
  | "truthy"
  | "set"
  | "unset"
  | "size"
  | "contains"
  | "notContains";
export interface OfflineAssertion {
  kind: "diagnostic" | "symbol" | "source" | "structure";
  operator: Operator;
  expected?: JsonValue;
  rule?: string;
  name?: string;
}
export interface RuntimeAssertion {
  condition: string;
  message?: string;
}
export interface TestCase {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  mode: "offline" | "runtime";
  targets: string[];
  assertions: (OfflineAssertion | RuntimeAssertion)[];
  setup?: string[];
  actions?: string[];
  cleanup?: string[];
  timeoutMs?: number;
  skip?: boolean;
  template?: boolean;
}
export type Status =
  | "discovered"
  | "queued"
  | "running"
  | "passed"
  | "failed"
  | "errored"
  | "skipped"
  | "cancelled"
  | "unsupported"
  | "not-executed";
export interface AssertionResult {
  message: string;
  passed: boolean;
  expected?: JsonValue;
  actual?: JsonValue;
}
export interface RuntimeFinding {
  file: string;
  line: number;
  severity: "error" | "warning" | "unknown";
  message: string;
}
export interface TestResult {
  id: string;
  name: string;
  file: string;
  mode: TestCase["mode"];
  status: Status;
  durationMs: number;
  assertions: AssertionResult[];
  error?: string;
  log?: string;
  runtimeDiagnostics?: RuntimeFinding[];
  runtimeVersions?: import("../runtime/compatibility").RuntimeVersions;
  targets: string[];
}
export interface RunRecord {
  version: 1;
  id: string;
  startedAt: string;
  durationMs: number;
  results: TestResult[];
  environment: Record<string, string>;
}
export interface ExecutionContext {
  root: string;
  signal: AbortSignal;
  read: (target: string) => Promise<string>;
  disabledRules?: string[];
  skriptVersion?: string;
}
export interface ExecutionProvider {
  readonly mode: TestCase["mode"];
  readonly capabilities: readonly string[];
  execute(
    test: TestCase,
    context: ExecutionContext,
  ): Promise<
    Pick<
      TestResult,
      | "status"
      | "assertions"
      | "error"
      | "log"
      | "runtimeDiagnostics"
      | "runtimeVersions"
    >
  >;
}
