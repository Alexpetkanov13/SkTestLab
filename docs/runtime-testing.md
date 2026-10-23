# Isolated runtime testing

## Status and setup

Real runtime verification now covers Java 21.0.12, Paper 1.21.11-132 and Skript 2.16.0, with additional ChickFarm checks using SkCine 1.0.1. Passing/failing assertions, parser errors, warning-only scripts, source mapping, startup cancellation and cleanup were exercised. The 0.2.0 version matrix also verified seven assertions on Paper 1.21 / Skript 2.9.0 and Paper 1.21.11 / Skript 2.14.0. See [compatibility policy](compatibility.md) for supported version selection and repeatable matrix testing. Other combinations remain unverified.

1. Obtain compatible Paper and Skript releases from official sources. JARs are executable code.
2. Configure Runtime selects absolute JAR paths and Java on the extension host.
3. Read https://www.minecraft.net/eula and explicitly accept it in setup.
4. Set addonJarPaths for required plugins.
5. Validate Runtime Environment checks Java execution/JAR accessibility, not server compatibility.
6. Set timeoutMs: 300000. Cold startup includes dependency downloads/world creation.

Consult [Paper requirements](https://docs.papermc.io/paper/getting-started/) for version-dependent Java requirements. Local real-server verification used Java 21.0.12 explicitly.

## Isolation

Each test gets a unique owned directory under extension global storage/runtime. Selected JARs/target scripts are copied. List all script dependencies. Source names become project-N.sk; script-name-dependent code and local functions inaccessible from the separate harness are unsupported. Production configurations/worlds are never copied.

Server properties bind 127.0.0.1 on an ephemeral port, disable RCON/query and limit view distance. Addons use numbered filenames; filename-dependent plugins may fail. Paper can download its dependencies. Loaded scripts can perform side effects: trust them. A disposable directory is not an OS sandbox.

Optional runtime.dependencyCachePath points to an existing server directory. Only cache, libraries and versions are copied; symbolic links are excluded. Worlds, plugin data, saved variables and server configuration are never imported. A disabled bStats configuration is generated in the isolated environment.

## Protocol and cleanup

A generated console-only command executes setup, actions, if/else assertions, cleanup and completion logging. It runs after Paper announces startup. Random nonces correlate markers; indexes, order, duplicates, completion and clean exit are validated. Nonces do not authenticate against hostile trusted plugins.

Standard command/condition/log syntax avoids depending on upstream development-only testing constructs. See [Skript upstream](https://github.com/SkriptLang/Skript) and [structures](https://docs.skriptlang.org/structures.html). Compatibility outside the recorded combination still needs verification.

Console output streams to Testing/output; bounded excerpts are retained. Multiline runtime diagnostics map back to original filenames/lines in Test Explorer, Problems and reports. Detected parse errors stop execution at startup without fabricated assertions. Known conjunction/constant-condition warnings stay warnings. Unclassified diagnostic messages conservatively block success. English log formats are tested; other locales/formats need verification.

## Reproduce real-server checks

Set SKTESTLAB_RUNTIME_SERVER to an existing test-server directory with Paper/Skript JARs and previously accepted eula.txt. Optionally set SKTESTLAB_RUNTIME_JAVA, then run npm run test:runtime. Explicit SKTESTLAB_PAPER_JAR, SKTESTLAB_SKRIPT_JAR and a JSON SKTESTLAB_ADDON_JARS array override discovery. Evidence is written under .vscode-test/runtime-real-*. The manual runtime workflow requires an owner-provisioned self-hosted runner. Normal CI remains offline.

Stop sends console stop, allows ten seconds, then attempts to kill Java. If closure is still unconfirmed after fifteen seconds, execution reports an error and preserves the environment. Cleanup waits for confirmed closure and verifies real path/ownership token before deletion. keepEnvironment retains worlds for inspection. Abrupt editor termination can leave artifacts. Cleanup failure becomes errored.

## Recovery after interruptions (0.3.0)

Use **SkTestLab: Recover Runtime Environments** in a trusted workspace, or **Recover environments** in the dashboard shortcuts. The picker shows retained environments in extension storage with their safety status. Select an inactive environment and review its exact path before choosing **Remove environment**. This removes its generated world and logs.

Each new environment records a host, editor PID, server PID and lifecycle phase in addition to its ownership token. The launch phase is recorded before starting Java; closure is recorded only after process closure. Recovery rechecks ownership, direct-child real paths and process status, claims the directory by renaming it inside storage, then checks again before deleting.

Active editor/server processes, inaccessible PID checks, directory links, malformed/mismatched ownership records and different hosts are protected. PID reuse conservatively protects the directory. Recovery never terminates a process. Closed retained environments can be removed while the editor is open if their server PID is absent.

An interruption between starting Java and recording its PID leaves an uncertain launch record; recovery preserves it for manual inspection. Environments created before ownership metadata existed are also preserved. Inspect their paths through the command's logs; do not remove them until you have independently confirmed no server uses them. Recovery is explicit, never automatic on startup. Trusted code can modify ownership records; this is not a defense against hostile plugins with OS access.

For developer reliability tests, set `SKTESTLAB_RELIABILITY_CONFIG` to a local runtime configuration JSON with already accepted EULA and run `npm run test:reliability`. Tests repeat cancellation during actions, time out a delayed action, terminate a disposable worker to simulate an editor-host crash, protect any remaining Java process, then recover after the test server stops. The crash test may forcibly terminate only the Java PID it just created in its own temporary environment. Production recovery never does so. Evidence stays under `.vscode-test/reliability-real-*`.

## Owner verification

Run the economy test on selected versions. Change balance expectation to 71 and confirm failure. Break syntax and confirm errored. Cancel startup and verify Java closes. Check loopback binding/retained environments. Record Java/Paper/Skript/addon versions in verification.md before promoting runtime support.
