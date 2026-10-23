import { RunRecord } from "../testing/model";
import { escapeHtml as esc } from "../security/paths";
export function report(
  record: RunRecord,
  format: "json" | "html" | "junit",
): string {
  if (format === "json") return JSON.stringify(record, null, 2);
  if (format === "html")
    return (
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;"><title>SkTestLab report</title><style>body{font:16px system-ui;max-width:1100px;margin:2rem auto;padding:1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #888;padding:.6rem;text-align:left}pre{white-space:pre-wrap}</style><h1>SkTestLab</h1><p>' +
      esc(record.startedAt) +
      " · " +
      record.durationMs +
      " ms</p><table><caption>Test results</caption><tr><th>Test</th><th>Status</th><th>Details</th></tr>" +
      record.results
        .map(
          (r) =>
            "<tr><td>" +
            esc(r.name) +
            "</td><td>" +
            esc(r.status) +
            "</td><td><pre>" +
            esc(
              (r.error ?? JSON.stringify(r.assertions, null, 2)) +
                (r.runtimeVersions
                  ? "\nObserved runtime: " + JSON.stringify(r.runtimeVersions)
                  : "") +
                (r.runtimeDiagnostics?.length
                  ? "\n" + JSON.stringify(r.runtimeDiagnostics, null, 2)
                  : ""),
            ) +
            "</pre></td></tr>",
        )
        .join("") +
      "</table></html>"
    );
  const failures = record.results.filter((r) => r.status === "failed").length,
    errors = record.results.filter((r) => r.status === "errored").length,
    skipped = record.results.filter(
      (r) => !["passed", "failed", "errored"].includes(r.status),
    ).length;
  return (
    '<?xml version="1.0" encoding="UTF-8"?><testsuite name="SkTestLab" tests="' +
    record.results.length +
    '" failures="' +
    failures +
    '" errors="' +
    errors +
    '" skipped="' +
    skipped +
    '" time="' +
    record.durationMs / 1000 +
    '">' +
    record.results
      .map(
        (r) =>
          '<testcase name="' +
          esc(r.name) +
          '" classname="' +
          esc(r.file) +
          '" time="' +
          r.durationMs / 1000 +
          '">' +
          (r.status === "passed"
            ? ""
            : r.status === "failed"
              ? '<failure message="Assertion failed">' +
                esc(JSON.stringify(r.assertions)) +
                "</failure>"
              : r.status === "errored"
                ? '<error message="' +
                  esc(r.error ?? "Execution error") +
                  '">' +
                  esc(JSON.stringify(r.runtimeDiagnostics ?? [])) +
                  "</error>"
                : '<skipped message="' + esc(r.status) + '"/>') +
          (r.runtimeVersions
            ? "<system-out>" +
              esc("Observed runtime: " + JSON.stringify(r.runtimeVersions)) +
              "</system-out>"
            : "") +
          "</testcase>",
      )
      .join("") +
    "</testsuite>"
  );
}
