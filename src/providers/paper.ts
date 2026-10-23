import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import {
  ExecutionContext,
  ExecutionProvider,
  TestCase,
} from "../testing/model";
import {
  RuntimeConfig,
  prepareEnvironment,
  validateRuntime,
} from "../runtime/environment";
import { marker } from "../runtime/protocol";
import { cleanLog } from "../security/paths";
import { SkriptLogDiagnostics } from "../runtime/logDiagnostics";
import {
  RuntimeVersions,
  observeVersions,
  minecraftSupported,
} from "../runtime/compatibility";
export class PaperProvider implements ExecutionProvider {
  readonly mode = "runtime" as const;
  readonly capabilities = [
    "skript-conditions",
    "project-functions",
    "isolated-server",
  ] as const;
  constructor(
    private config: RuntimeConfig,
    private storage: string,
    private trusted: () => boolean,
    private output: (line: string) => void = () => {},
  ) {}
  async execute(test: TestCase, c: ExecutionContext) {
    if (!this.trusted())
      throw new Error("Runtime testing requires Workspace Trust");
    c.signal.throwIfAborted();
    await validateRuntime(this.config);
    c.signal.throwIfAborted();
    const env = await prepareEnvironment(
      this.storage,
      c.root,
      test,
      this.config,
    );
    try {
      c.signal.throwIfAborted();
      await env.launching();
      if (c.signal.aborted) {
        await env.closed();
        c.signal.throwIfAborted();
      }
      return await new Promise<
        Awaited<ReturnType<ExecutionProvider["execute"]>>
      >((resolve, reject) => {
        const child = spawn(
          this.config.javaPath,
          [
            "-Xms256M",
            "-Xmx" + this.config.memoryMb + "M",
            "-jar",
            "paper.jar",
            "--nogui",
          ],
          {
            cwd: env.directory,
            shell: false,
            windowsHide: true,
            stdio: ["pipe", "pipe", "pipe"],
          },
        );
        let log = "",
          done = false,
          began = false,
          ready = false,
          settled = false;
        const diagnostics = new SkriptLogDiagnostics();
        const versions: RuntimeVersions = {};
        let failure: Error | undefined;
        const assertions = new Map<number, boolean>();
        let killTimer: ReturnType<typeof setTimeout> | undefined;
        let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
        const stop = () => {
          if (settled || killTimer) return;
          try {
            if (!child.stdin.destroyed) child.stdin.write("stop\n");
          } catch (error) {
            failure ??=
              error instanceof Error ? error : new Error(String(error));
          }
          killTimer = setTimeout(() => {
            try {
              child.kill("SIGKILL");
            } catch (error) {
              failure ??= new Error("Could not stop runtime: " + String(error));
            }
          }, 10000);
          shutdownTimer = setTimeout(() => {
            if (settled) return;
            settled = true;
            clearTimeout(startup);
            c.signal.removeEventListener("abort", abort);
            reject(
              new Error(
                "Runtime shutdown could not be confirmed; environment retained at " +
                  env.directory,
              ),
            );
          }, 15000);
        };
        const leaseUpdate = env.running(child.pid).catch((error) => {
          failure = new Error("Could not record runtime PID: " + String(error));
          stop();
        });
        const abort = () => {
          failure = new Error("Runtime execution cancelled");
          stop();
        };
        c.signal.addEventListener("abort", abort, { once: true });
        const startup = setTimeout(() => {
          failure = new Error("Paper startup timed out");
          stop();
        }, this.config.startupTimeoutMs);
        const finish = async (error?: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(startup);
          if (killTimer) clearTimeout(killTimer);
          if (shutdownTimer) clearTimeout(shutdownTimer);
          c.signal.removeEventListener("abort", abort);
          try {
            await leaseUpdate;
            await env.closed();
          } catch (recordError) {
            reject(
              new Error(
                "Could not record process closure; environment retained: " +
                  String(recordError),
              ),
            );
            return;
          }
          if (error || failure) {
            reject(
              new Error((error ?? failure)?.message + "\n" + log.slice(-12000)),
            );
            return;
          }
          if (
            !diagnostics.blocksSuccess &&
            (!done || !began || assertions.size !== test.assertions.length)
          ) {
            reject(
              new Error(
                "Server exited without a complete authenticated result sequence. Inspect the test log.",
              ),
            );
            return;
          }
          resolve({
            status: diagnostics.blocksSuccess
              ? "errored"
              : [...assertions.values()].every(Boolean)
                ? "passed"
                : "failed",
            error: diagnostics.blocksSuccess
              ? "Skript reported script load errors; assertions are not sufficient to confirm project behavior"
              : undefined,
            log,
            runtimeVersions: versions,
            runtimeDiagnostics: diagnostics.findings.map((f) => {
              const index = /^project-(\d+)\.sk$/.exec(f.file);
              return {
                ...f,
                file: index
                  ? (test.targets[Number(index[1])] ?? f.file)
                  : f.file,
              };
            }),
            assertions: test.assertions.flatMap((a, i) =>
              assertions.has(i)
                ? [
                    {
                      passed: assertions.get(i) === true,
                      message:
                        "condition" in a
                          ? (a.message ?? a.condition)
                          : "Invalid assertion",
                      expected: true,
                      actual: assertions.get(i) ?? false,
                    },
                  ]
                : [],
            ),
          });
        };
        const line = (raw: string) => {
          const text = cleanLog(raw);
          log = (log + text + "\n").slice(-200000);
          try {
            this.output(text);
          } catch (error) {
            failure = new Error(
              "Runtime log consumer failed: " + String(error),
            );
            stop();
            return;
          }
          diagnostics.consume(text);
          observeVersions(text, versions);
          if (!ready && /Done \([^)]+\)!/.test(text)) {
            ready = true;
            clearTimeout(startup);
            if (failure || c.signal.aborted) stop();
            else if (
              versions.minecraft &&
              minecraftSupported(versions.minecraft) === false
            ) {
              failure = new Error(
                "Minecraft " +
                  versions.minecraft +
                  " is below the supported 1.21 baseline",
              );
              stop();
            } else if (diagnostics.blocksSuccess) stop();
            else child.stdin.write(env.command + "\n");
          }
          try {
            const m = marker(text, env.nonce, test.assertions.length);
            if (!m) return;
            if (m.kind === "BEGIN") {
              if (began) throw new Error("Duplicate BEGIN marker");
              began = true;
            } else if (m.kind === "ASSERT") {
              if (!began || done || assertions.has(m.index))
                throw new Error("Out-of-order or duplicate assertion marker");
              assertions.set(m.index, m.passed);
            } else {
              if (!began || done || assertions.size !== test.assertions.length)
                throw new Error("Incomplete END marker");
              done = true;
              stop();
            }
          } catch (e) {
            failure = e instanceof Error ? e : new Error(String(e));
            stop();
          }
        };
        const streams = [
          { buffer: "", decoder: new StringDecoder("utf8") },
          { buffer: "", decoder: new StringDecoder("utf8") },
        ];
        const data = (index: number, b: Buffer) => {
          const stream = streams[index];
          let buffer = stream.buffer + stream.decoder.write(b);
          if (buffer.length > 1048576) {
            failure = new Error("Server output line exceeded 1 MiB");
            stream.buffer = "";
            stop();
            return;
          }
          let i: number;
          while ((i = buffer.indexOf("\n")) >= 0) {
            line(buffer.slice(0, i).replace(/\r$/, ""));
            buffer = buffer.slice(i + 1);
          }
          stream.buffer = buffer;
        };
        child.stdout.on("data", (b) => data(0, b));
        child.stderr.on("data", (b) => data(1, b));
        child.stdin.on("error", (e) => {
          failure ??= e;
        });
        child.on("error", (error) => {
          failure ??= error;
          if (!child.pid) void finish(error);
          else stop();
        });
        child.on("close", (code, signal) => {
          for (const stream of streams) {
            const tail = stream.buffer + stream.decoder.end();
            if (tail) line(tail);
          }
          if (code !== 0)
            failure ??= new Error(
              "Paper exited abnormally: " + (signal ?? code),
            );
          void finish();
        });
        if (c.signal.aborted) abort();
      });
    } finally {
      await env.cleanup();
    }
  }
}
