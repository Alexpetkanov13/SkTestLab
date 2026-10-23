import { Analysis, AnalysisOptions, Finding, Node, Symbol } from "./model";
import { lex } from "./lexer";
const known =
  /^(?:options|variables|command(?:\s+.*)?|(?:local )?function(?:\s+.*)?|on(?:\s+.*)?|if(?:\s+.*)?|else(?:\s+if(?:\s+.*)?)?|loop(?:\s+.*)?|while(?:\s+.*)?|trigger)$/i;
export const ruleDescriptions: Record<string, string> = {
  SK001: "Mixed tabs and spaces in an indentation prefix.",
  SK002: "Known section is missing its final colon.",
  SK003: "Section has no executable children.",
  SK004: "Code follows an unconditional stop or return in the same block.",
  SK005: "Nested loops use an ambiguous loop-number.",
  SK006: "Duplicate declaration.",
  SK007: "Local is written but never referenced in this scope (heuristic).",
  SK008: "Nesting exceeds the configured limit.",
  SK009: "Potentially expensive scan inside a frequent event (heuristic).",
  SK010: "Incomplete function or command declaration.",
  SK011: "Indentation does not follow a preceding section.",
  SK012: "Syntax requires a newer selected Skript version.",
};
export function analyze(
  source: string,
  options: AnalysisOptions = {},
): Analysis {
  const nodes: Node[] = [],
    flat: Node[] = [],
    symbols: Symbol[] = [],
    findings: Finding[] = [];
  const stack: Node[] = [];
  const add = (
    n: Node,
    id: string,
    message: string,
    confidence: Finding["confidence"] = "structural",
    fix?: Finding["fix"],
  ) => {
    if (!options.disabledRules?.includes(id))
      findings.push({
        id,
        message,
        confidence,
        range: { line: n.line, start: n.whitespace.length, end: n.raw.length },
        severity: ["SK002", "SK006", "SK010", "SK011"].includes(id)
          ? "error"
          : "warning",
        fix,
      });
  };
  source.split(/\r?\n/).forEach((raw, line) => {
    const tokens = lex(raw);
    const code = tokens
      .filter((t) => t.kind !== "comment")
      .map((t) => t.text)
      .join("")
      .trim();
    if (!code) return;
    const whitespace = raw.match(/^\s*/)?.[0] ?? "";
    const indent = [...whitespace].reduce(
      (v, c) => v + (c === "\t" ? 4 : 1),
      0,
    );
    const section = code.endsWith(":");
    const header = section ? code.slice(0, -1) : code;
    while (stack.length && stack[stack.length - 1].indent >= indent)
      stack.pop();
    const parent = stack[stack.length - 1];
    const n: Node = {
      line,
      raw,
      code,
      indent,
      whitespace,
      tokens,
      header,
      children: [],
      parent,
      kind: section ? "section" : known.test(header) ? "statement" : "unknown",
      confidence: known.test(header) ? "structural" : "heuristic",
    };
    (parent ? parent.children : nodes).push(n);
    flat.push(n);
    if (whitespace.includes(" ") && whitespace.includes("\t"))
      add(n, "SK001", ruleDescriptions.SK001, "structural", {
        text: " ".repeat(indent),
        range: { line, start: 0, end: whitespace.length },
      });
    if (known.test(header) && !section)
      add(n, "SK002", ruleDescriptions.SK002, "structural", {
        text: ":",
        range: {
          line,
          start: raw
            .slice(
              0,
              tokens.find((t) => t.kind === "comment")?.start ?? raw.length,
            )
            .trimEnd().length,
          end: raw
            .slice(
              0,
              tokens.find((t) => t.kind === "comment")?.start ?? raw.length,
            )
            .trimEnd().length,
        },
      });
    if (indent > 0 && !parent) add(n, "SK011", ruleDescriptions.SK011);
    if (stack.length > (options.maxDepth ?? 6))
      add(n, "SK008", ruleDescriptions.SK008, "heuristic");
    if (section) stack.push(n);
    const f = header.match(/^(local )?function\s+([\w\p{L}]+)\s*\(/u);
    const c = header.match(/^command\s+\/?([^\s:[<]+)/i);
    if (f) symbols.push({ kind: "function", name: f[2], line, local: !!f[1] });
    if (c)
      symbols.push({
        kind: "command",
        name: c[1].toLowerCase(),
        line,
        local: false,
      });
    if (
      (/^(?:local )?function\b/.test(header) && !f) ||
      (/^command\b/.test(header) && !c)
    )
      add(n, "SK010", ruleDescriptions.SK010);
    if (parent?.header === "options")
      symbols.push({
        kind: "option",
        name: header.split(":")[0].trim(),
        line,
        local: true,
      });
    if (/^on\b/.test(header))
      symbols.push({ kind: "event", name: header, line, local: true });
    for (const t of tokens.filter((t) => t.kind === "variable"))
      symbols.push({
        kind: "variable",
        name: t.text,
        line,
        local: t.text.startsWith("{_"),
      });
    const loops: Node[] = [];
    let p: Node | undefined = parent;
    while (p) {
      if (/^loop\b/.test(p.header)) loops.push(p);
      p = p.parent;
    }
    const active = tokens
      .filter((t) => t.kind !== "string" && t.kind !== "comment")
      .map((t) => t.text)
      .join("");
    const numberLoops = loops.filter((loop) =>
      /^loop\s+(?:.+\s+times|(?:the\s+)?(?:integers|numbers)\b.*)$/i.test(
        loop.header,
      ),
    );
    if (numberLoops.length > 1 && /\bloop-number\b(?!-\d)/.test(active))
      add(n, "SK005", ruleDescriptions.SK005, "heuristic");
    let event: Node | undefined = parent;
    while (event?.parent) event = event.parent;
    if (
      event &&
      /^on (?:chat|move|walk|damage)\b/.test(event.header) &&
      /\b(?:all entities|all blocks|all offline players)\b/.test(active)
    )
      add(n, "SK009", ruleDescriptions.SK009, "heuristic");
    if (
      options.skriptVersion &&
      /^local function /.test(header) &&
      compareVersion(options.skriptVersion, "2.7") < 0
    )
      add(
        n,
        "SK012",
        "Local functions require Skript 2.7 or newer.",
        "structural",
      );
  });
  for (const n of flat) {
    if (n.kind === "section" && known.test(n.header) && n.children.length === 0)
      add(n, "SK003", ruleDescriptions.SK003);
    let terminated = false;
    for (const child of n.children) {
      if (terminated) add(child, "SK004", ruleDescriptions.SK004);
      // Addon expression definitions use "return type: ..." as metadata.
      if (/^(?:stop|return(?:\s+(?!type\s*:).*)?)$/i.test(child.code))
        terminated = true;
    }
  }
  // Only report single writes in a whole trigger/function scope. Interpolation
  // text is included so a use inside a string does not become a false warning.
  for (const root of nodes) {
    const scoped: Node[] = [];
    const visit = (node: Node) => {
      scoped.push(node);
      node.children.forEach(visit);
    };
    visit(root);
    const text = scoped
      .map((n) =>
        n.tokens
          .filter((t) => t.kind !== "comment")
          .map((t) => t.text)
          .join(""),
      )
      .join("\n");
    for (const n of scoped) {
      const write = /^set\s+(\{_[\w]+\})\s+to\b/i.exec(n.code);
      if (write && text.split(write[1]).length === 2)
        add(
          n,
          "SK007",
          "Local " +
            write[1] +
            " is assigned but never referenced in this trigger (heuristic).",
          "heuristic",
        );
    }
  }
  const seen = new Set<string>();
  for (const s of symbols.filter(
    (s) => s.kind === "function" || s.kind === "command",
  )) {
    const key = s.kind + ":" + s.name.toLowerCase();
    if (seen.has(key))
      add(
        flat.find((n) => n.line === s.line)!,
        "SK006",
        "Duplicate " + s.kind + " " + s.name,
      );
    seen.add(key);
  }
  return { source, nodes, flat, symbols, findings };
}
export function compareVersion(a: string, b: string): number {
  const x = a.split(".").map(Number),
    y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}
/** Bounded per-document revision cache; callers invalidate on configuration changes. */
export class AnalysisCache {
  private cache = new Map<string, { version: number; result: Analysis }>();
  get(
    id: string,
    version: number,
    source: string,
    options: AnalysisOptions = {},
  ): Analysis {
    const old = this.cache.get(id);
    if (old?.version === version) return old.result;
    const result = analyze(source, options);
    this.cache.delete(id);
    this.cache.set(id, { version, result });
    if (this.cache.size > 250)
      this.cache.delete(this.cache.keys().next().value!);
    return result;
  }
  clear() {
    this.cache.clear();
  }
  delete(id: string) {
    this.cache.delete(id);
  }
}
export function crossFileDuplicates(
  files: Map<string, Analysis>,
): Map<string, Finding[]> {
  const result = new Map<string, Finding[]>(),
    seen = new Map<string, string>();
  for (const [file, a] of files)
    for (const s of a.symbols.filter(
      (s) => (s.kind === "function" && !s.local) || s.kind === "command",
    )) {
      const key = s.kind + ":" + s.name.toLowerCase(),
        previous = seen.get(key);
      if (previous && previous !== file) {
        const n = a.flat.find((n) => n.line === s.line)!;
        result.set(file, [
          ...(result.get(file) ?? []),
          {
            id: "SK006",
            severity: "warning",
            confidence: "heuristic",
            message: "Declaration also appears in " + previous,
            range: {
              line: s.line,
              start: n.whitespace.length,
              end: n.raw.length,
            },
          },
        ]);
      } else seen.set(key, file);
    }
  return result;
}
