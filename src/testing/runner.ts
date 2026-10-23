import { randomUUID } from "node:crypto";
import {
  ExecutionContext,
  ExecutionProvider,
  RunRecord,
  TestCase,
  TestResult,
} from "./model";
export interface Selection {
  file: string;
  test: TestCase;
}
export async function runTests(
  selection: Selection[],
  providers: ExecutionProvider[],
  context: ExecutionContext,
  onResult?: (result: TestResult) => void,
): Promise<RunRecord> {
  const start = Date.now();
  const record: RunRecord = {
    version: 1,
    id: randomUUID(),
    startedAt: new Date(start).toISOString(),
    durationMs: 0,
    results: [],
    environment: { node: process.version, platform: process.platform },
  };
  for (const { file, test } of selection) {
    const began = Date.now();
    let partial: Pick<
      TestResult,
      | "status"
      | "assertions"
      | "error"
      | "log"
      | "runtimeDiagnostics"
      | "runtimeVersions"
    > = {
      status: "not-executed",
      assertions: [],
    };
    if (context.signal.aborted) partial.status = "cancelled";
    else if (test.skip) partial.status = "skipped";
    else if (test.template) {
      partial.status = "not-executed";
      partial.error =
        "Complete this generated template and remove template: true";
    } else {
      const provider = providers.find((p) => p.mode === test.mode);
      if (!provider) {
        partial.status = "unsupported";
        partial.error = "No execution provider for " + test.mode;
      } else {
        const abort = new AbortController();
        const cancel = () => abort.abort(context.signal.reason);
        context.signal.addEventListener("abort", cancel, { once: true });
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          abort.abort(new Error("Test timed out"));
        }, test.timeoutMs ?? 30000);
        try {
          partial = await provider.execute(test, {
            ...context,
            signal: abort.signal,
          });
          if (abort.signal.aborted)
            partial = {
              status: timedOut ? "errored" : "cancelled",
              assertions: [],
              error: timedOut ? "Test timed out" : "Cancelled",
            };
        } catch (error) {
          partial = {
            status: context.signal.aborted ? "cancelled" : "errored",
            assertions: [],
            error: timedOut ? "Test timed out" : String(error),
          };
        } finally {
          clearTimeout(timer);
          context.signal.removeEventListener("abort", cancel);
        }
      }
    }
    const result: TestResult = {
      id: test.id,
      name: test.name,
      file,
      mode: test.mode,
      targets: test.targets,
      durationMs: Date.now() - began,
      ...partial,
    };
    record.results.push(result);
    onResult?.(result);
  }
  record.durationMs = Date.now() - start;
  return record;
}
