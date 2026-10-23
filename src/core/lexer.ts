import { Token } from "./model";
/** Source-preserving scanner. Skript escapes quotes by doubling them. */
export function lex(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const start = i;
    let kind: Token["kind"] = "text";
    if (line[i] === "#") {
      tokens.push({
        kind: "comment",
        text: line.slice(i),
        start,
        end: line.length,
      });
      break;
    }
    if (line[i] === '"') {
      kind = "string";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
    } else if (line[i] === "{") {
      kind = line[i + 1] === "@" ? "option" : "variable";
      let depth = 1;
      i++;
      while (i < line.length && depth) {
        if (line[i] === "{") depth++;
        if (line[i] === "}") depth--;
        i++;
      }
    } else {
      i++;
      while (i < line.length && !["#", '"', "{"].includes(line[i])) i++;
    }
    tokens.push({ kind, text: line.slice(start, i), start, end: i });
  }
  return tokens;
}
