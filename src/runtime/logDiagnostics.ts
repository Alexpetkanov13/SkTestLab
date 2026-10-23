import { RuntimeFinding } from "../testing/model";

/** Skript emits diagnostic source headers and details on separate INFO lines.
 * Unclassified diagnostics block success rather than silently passing. */
export class SkriptLogDiagnostics {
  readonly findings: RuntimeFinding[] = [];
  private pending?: { file: string; line: number };
  private summaryError = false;
  consume(raw: string): void {
    const text = raw
      .replace(/^\s*>+\s*/, "")
      .replace(/^\[[^\]]*(?:INFO|WARN|ERROR|SEVERE|DEBUG)\]:\s*/i, "")
      .trim();
    const header = /\[Skript\]\s+Line\s+(\d+):\s+\(([^)]+)\)/i.exec(text);
    if (header) {
      if (this.pending)
        this.findings.push({
          ...this.pending,
          severity: "unknown",
          message: "Runtime diagnostic header had no recognizable detail",
        });
      this.pending = { file: header[2], line: Number(header[1]) };
      return;
    }
    if (
      /\[Skript\].*(?:encountered.*errors?|can't understand|could not load)/i.test(
        text,
      ) ||
      /\[ERROR\].*(?:project-\d+|zz-sktestlab)/i.test(raw)
    )
      this.summaryError = true;
    if (
      !this.pending ||
      !text ||
      text === ">" ||
      text.startsWith("Line:") ||
      text.startsWith("[")
    )
      return;
    const warning =
      /^List is missing 'and' or 'or', defaulting to '(?:and|or)':/i.test(
        text,
      ) || /^The condition '.+' will always be (?:true|false)\.$/i.test(text);
    const error =
      /^(?:Can't understand|Cannot understand|There's no|There is no|A function named|The function|Invalid|You can't|Can't use)/i.test(
        text,
      );
    this.findings.push({
      ...this.pending,
      severity: warning ? "warning" : error ? "error" : "unknown",
      message: text,
    });
    this.pending = undefined;
  }
  get blocksSuccess(): boolean {
    return (
      this.summaryError ||
      !!this.pending ||
      this.findings.some((f) => f.severity !== "warning")
    );
  }
}
