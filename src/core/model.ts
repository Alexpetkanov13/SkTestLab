export interface Range {
  line: number;
  start: number;
  end: number;
}
export type Confidence = "structural" | "heuristic";
export interface Finding {
  id: string;
  severity: "error" | "warning" | "information";
  message: string;
  range: Range;
  confidence: Confidence;
  fix?: { text: string; range: Range };
}
export interface Token {
  kind: "string" | "variable" | "option" | "text" | "comment";
  text: string;
  start: number;
  end: number;
}
export interface Node {
  line: number;
  raw: string;
  code: string;
  indent: number;
  whitespace: string;
  kind: "section" | "statement" | "unknown";
  header: string;
  tokens: Token[];
  children: Node[];
  parent?: Node;
  confidence: Confidence;
}
export interface Symbol {
  kind: "function" | "command" | "option" | "variable" | "event";
  name: string;
  line: number;
  local: boolean;
}
export interface Analysis {
  source: string;
  nodes: Node[];
  flat: Node[];
  symbols: Symbol[];
  findings: Finding[];
}
export interface AnalysisOptions {
  disabledRules?: string[];
  maxDepth?: number;
  skriptVersion?: string;
}
