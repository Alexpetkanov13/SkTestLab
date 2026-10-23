import { RuntimeAssertion, TestCase } from "../testing/model";
export type Marker =
  | { kind: "BEGIN" | "END" }
  | { kind: "ASSERT"; index: number; passed: boolean };
export function marker(
  line: string,
  nonce: string,
  count: number,
): Marker | undefined {
  const prefix = "SKTL|" + nonce + "|";
  const at = line.indexOf(prefix);
  if (at < 0) return;
  const value = line.slice(at + prefix.length).trim();
  if (value === "BEGIN" || value === "END") return { kind: value };
  const match = /^ASSERT\|(\d+)\|(PASS|FAIL)$/.exec(value);
  if (!match || Number(match[1]) >= count)
    throw new Error("Malformed runtime marker");
  return {
    kind: "ASSERT",
    index: Number(match[1]),
    passed: match[2] === "PASS",
  };
}
/** No upstream development-only test constructs: ordinary command, if and log. */
export function harness(test: TestCase, nonce: string): string {
  const command = "sktl" + nonce;
  const lines = [
    "command /" + command + ":",
    "    executable by: console",
    "    trigger:",
    '        log "SKTL|' + nonce + '|BEGIN"',
  ];
  const effect = (s: string) => "        " + s;
  for (const s of test.setup ?? []) lines.push(effect(s));
  for (const s of test.actions ?? []) lines.push(effect(s));
  test.assertions.forEach((a, i) => {
    if (!("condition" in a))
      throw new Error("Offline assertion in runtime test");
    const assertion = a as RuntimeAssertion;
    lines.push(
      "        if " + assertion.condition + ":",
      '            log "SKTL|' + nonce + "|ASSERT|" + i + '|PASS"',
      "        else:",
      '            log "SKTL|' + nonce + "|ASSERT|" + i + '|FAIL"',
    );
  });
  for (const s of test.cleanup ?? []) lines.push(effect(s));
  lines.push('        log "SKTL|' + nonce + '|END"');
  return lines.join("\n") + "\n";
}
