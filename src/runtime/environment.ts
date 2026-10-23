import {
  access,
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { safeTarget } from "../security/paths";
import { TestCase } from "../testing/model";
import { harness } from "./protocol";
import { javaMajor } from "./compatibility";
import { newLease, writeLease, processAlive } from "./recovery";
export interface RuntimeConfig {
  javaPath: string;
  paperJarPath: string;
  skriptJarPath: string;
  addonJarPaths: string[];
  memoryMb: number;
  startupTimeoutMs: number;
  keepEnvironment: boolean;
  eulaAccepted: boolean;
  dependencyCachePath?: string;
}
export async function validateRuntime(c: RuntimeConfig): Promise<string> {
  if (!c.eulaAccepted)
    throw new Error(
      "Accept the Minecraft EULA in SkTestLab runtime configuration before launching. https://www.minecraft.net/eula",
    );
  if (!Number.isInteger(c.memoryMb) || c.memoryMb < 512 || c.memoryMb > 16384)
    throw new Error("Runtime memory must be 512–16384 MiB");
  if (c.startupTimeoutMs < 1000 || c.startupTimeoutMs > 600000)
    throw new Error("Startup timeout must be 1000–600000 ms");
  if (c.dependencyCachePath && !path.isAbsolute(c.dependencyCachePath))
    throw new Error(
      "Dependency cache must be an absolute server directory path",
    );
  for (const p of [c.paperJarPath, c.skriptJarPath, ...c.addonJarPaths]) {
    if (!path.isAbsolute(p) || !p.toLowerCase().endsWith(".jar"))
      throw new Error("Select absolute JAR paths");
    await access(p);
  }
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(c.javaPath, ["-version"], {
      shell: false,
      windowsHide: true,
    });
    let output = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Java version check timed out"));
    }, 10000);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.stderr.on("data", (b) => (output += String(b).slice(0, 4096)));
    child.stdout.on("data", (b) => (output += String(b).slice(0, 4096)));
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        const major = javaMajor(output);
        if (major !== undefined && major < 21)
          reject(
            new Error(
              "Minecraft 1.21+ requires Java 21 or newer. Select the Java executable required by your Paper version.",
            ),
          );
        else resolve(output.trim());
      } else reject(new Error("Java version check failed: " + output));
    });
  });
}
export interface Environment {
  directory: string;
  nonce: string;
  command: string;
  cleanup: () => Promise<void>;
  launching: () => Promise<void>;
  running: (pid: number | undefined) => Promise<void>;
  closed: () => Promise<void>;
}
export async function prepareEnvironment(
  storage: string,
  root: string,
  test: TestCase,
  c: RuntimeConfig,
): Promise<Environment> {
  await mkdir(storage, { recursive: true });
  const directory = await mkdtemp(path.join(storage, "sktestlab-"));
  const nonce = randomUUID().replaceAll("-", "");
  await writeFile(path.join(directory, ".sktestlab-owner"), nonce);
  const lease = newLease(nonce);
  await writeLease(directory, lease);
  const cleanup = async () => {
    if (c.keepEnvironment) return;
    if (lease.phase !== "preparing" && lease.phase !== "closed")
      throw new Error(
        "Runtime process closure is unconfirmed; environment retained at " +
          directory,
      );
    if (lease.serverPid && processAlive(lease.serverPid))
      throw new Error(
        "Runtime PID remains present; environment retained at " + directory,
      );
    const base = await realpath(storage),
      actual = await realpath(directory),
      relative = path.relative(base, actual);
    if (
      !relative ||
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      (await readFile(path.join(actual, ".sktestlab-owner"), "utf8")) !== nonce
    )
      throw new Error("Refusing cleanup: environment ownership mismatch");
    await rm(actual, { recursive: true, force: true });
  };
  try {
    // Only immutable server dependency directories are eligible. Never import
    // worlds, plugin data, variables, permissions or production configuration.
    if (c.dependencyCachePath) {
      for (const name of ["cache", "libraries", "versions"]) {
        const source = path.join(c.dependencyCachePath, name);
        try {
          const entry = await lstat(source);
          if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        await cp(source, path.join(directory, name), {
          recursive: true,
          filter: async (file) => !(await lstat(file)).isSymbolicLink(),
        });
      }
    }
    await mkdir(path.join(directory, "plugins", "Skript", "scripts"), {
      recursive: true,
    });
    await copyFile(c.paperJarPath, path.join(directory, "paper.jar"));
    await copyFile(
      c.skriptJarPath,
      path.join(directory, "plugins", "Skript.jar"),
    );
    for (const [i, p] of c.addonJarPaths.entries())
      await copyFile(p, path.join(directory, "plugins", "addon-" + i + ".jar"));
    for (const [i, target] of test.targets.entries())
      await copyFile(
        await safeTarget(root, target),
        path.join(
          directory,
          "plugins",
          "Skript",
          "scripts",
          "project-" + i + ".sk",
        ),
      );
    await writeFile(
      path.join(directory, "plugins", "Skript", "scripts", "zz-sktestlab.sk"),
      harness(test, nonce),
    );
    await writeFile(path.join(directory, "eula.txt"), "eula=true\n");
    await mkdir(path.join(directory, "plugins", "bStats"), { recursive: true });
    await writeFile(
      path.join(directory, "plugins", "bStats", "config.yml"),
      "enabled: false\nlogFailedRequests: false\nlogSentData: false\n",
    );
    await writeFile(
      path.join(directory, "server.properties"),
      "server-ip=127.0.0.1\nserver-port=0\nonline-mode=true\nlevel-name=sktestlab-world\nmax-players=1\nview-distance=2\nsimulation-distance=2\nenable-rcon=false\nenable-query=false\nspawn-protection=0\n",
    );
    return {
      directory,
      nonce,
      command: "sktl" + nonce,
      cleanup,
      launching: async () => {
        lease.phase = "launching";
        await writeLease(directory, lease);
      },
      running: async (pid) => {
        if (pid !== undefined) {
          lease.phase = "running";
          lease.serverPid = pid;
          await writeLease(directory, lease);
        }
      },
      closed: async () => {
        lease.phase = "closed";
        await writeLease(directory, lease);
      },
    };
  } catch (e) {
    await cleanup();
    throw e;
  }
}
