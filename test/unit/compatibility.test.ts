import { expect, it } from "vitest";
import {
  compatibilityNotes,
  javaMajor,
  minecraftSupported,
  observeVersions,
  RuntimeVersions,
} from "../../src/runtime/compatibility";

it.each(["1.21", "1.21.1", "1.21.11", "1.22", "26.1", "26.3", "27.1-pre1"])(
  "accepts Minecraft %s without a patch whitelist",
  (version) => {
    expect(minecraftSupported(version)).toBe(true);
  },
);
it.each(["1.20.6", "1.19.4", "1.8.8"])(
  "identifies %s below the supported baseline",
  (version) => {
    expect(minecraftSupported(version)).toBe(false);
  },
);
it("does not invent support for unknown version formats", () => {
  expect(minecraftSupported("snapshot unknown")).toBeUndefined();
  expect(
    compatibilityNotes({ minecraft: "unknown", skript: "2.17.0" }).join(),
  ).toContain("unverified");
});
it.each(["2.9.0", "2.10.2", "2.14.0", "2.16.0", "2.17.0-pre1", "3.0.0"])(
  "observes Skript %s from startup rather than filenames",
  (version) => {
    const versions: RuntimeVersions = {};
    observeVersions(
      "[Skript] Loading server plugin Skript v" + version,
      versions,
    );
    observeVersions("Starting minecraft server version 1.21.11", versions);
    observeVersions("[bootstrap] Running Java 21 (Oracle)", versions);
    expect(versions).toEqual({
      minecraft: "1.21.11",
      skript: version,
      java: "21",
    });
  },
);
it("reads older Skript enabling messages and flags prereleases", () => {
  const versions: RuntimeVersions = {};
  observeVersions("[Skript] Enabling Skript v2.9.0-beta1", versions);
  expect(versions.skript).toBe("2.9.0-beta1");
  expect(compatibilityNotes(versions).join()).toContain("Prerelease");
  expect(compatibilityNotes({}).join()).toContain("incomplete");
});
it("reads Java 8, 17, 21 and 25 vendor output", () => {
  expect(javaMajor('java version "1.8.0_422"')).toBe(8);
  expect(javaMajor('openjdk version "17.0.12"')).toBe(17);
  expect(javaMajor('java version "21.0.12"')).toBe(21);
  expect(javaMajor('openjdk version "25-ea"')).toBe(25);
  expect(javaMajor("unknown vendor")).toBeUndefined();
});
