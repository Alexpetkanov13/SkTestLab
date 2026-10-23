/** Observed startup evidence, never inferred from a JAR filename. */
export interface RuntimeVersions {
  minecraft?: string;
  skript?: string;
  java?: string;
}
export function observeVersions(line: string, versions: RuntimeVersions): void {
  const minecraft = /Starting minecraft server version\s+([\w.+-]+)/i.exec(
    line,
  );
  const skript =
    /\[Skript\].*?(?:Loading server plugin Skript v?|Enabling Skript v?|Skript v)([\d][\w.+-]*)/i.exec(
      line,
    );
  const java = /Running Java\s+(\d+(?:\.\d+)*)/i.exec(line);
  if (minecraft) versions.minecraft = minecraft[1];
  if (skript) versions.skript = skript[1];
  if (java) versions.java = java[1];
}
export function minecraftSupported(version: string): boolean | undefined {
  // Both the legacy 1.x scheme and Minecraft's year-based releases are accepted.
  const match = /^(\d+)\.(\d+)(?:\.\d+)?(?:[-+][\w.-]+)?$/.exec(version);
  if (!match) return undefined;
  const major = Number(match[1]),
    minor = Number(match[2]);
  return major > 1 || (major === 1 && minor >= 21);
}
export function javaMajor(output: string): number | undefined {
  const match = /(?:openjdk|java) version "(?:1\.)?(\d+)/i.exec(output);
  return match ? Number(match[1]) : undefined;
}
export function compatibilityNotes(versions: RuntimeVersions): string[] {
  const notes: string[] = [];
  if (!versions.minecraft || !versions.skript)
    notes.push(
      "Version evidence incomplete; inspect the server log before claiming compatibility.",
    );
  if (versions.minecraft && minecraftSupported(versions.minecraft) === false)
    notes.push("This server is below the supported Minecraft 1.21 baseline.");
  if (
    versions.minecraft &&
    minecraftSupported(versions.minecraft) === undefined
  )
    notes.push(
      "Unrecognized Minecraft version format; compatibility is unverified.",
    );
  if (
    versions.skript &&
    /(?:pre|beta|alpha|dev|nightly|snapshot|rc)/i.test(versions.skript)
  )
    notes.push(
      "Prerelease Skript detected; repeat tests before upgrading a production server.",
    );
  return notes;
}
