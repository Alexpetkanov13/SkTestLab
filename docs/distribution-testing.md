# Installed download acceptance

This runner requires Windows x64, Node 24, Python 3 and development dependencies from `npm ci`. It tests the installed artifact from the ZIP rather than using the source extension as the product. A separate tiny extension-test driver runs VS Code API checks. Your current VS Code profile and real project files are not used.

Prepare the candidate, then check installation/offline testing/failure evidence/export/uninstall:

```powershell
npm run release:prepare
npm run test:distribution
```

Optional real runtime and upgrade checks:

```powershell
$env:SKTESTLAB_ACCEPT_RUNTIME_CONFIG = 'C:/path/to/my-runtime-config.json'
$env:SKTESTLAB_ACCEPT_PREVIOUS_VSIX = 'C:/path/to/sktestlab-0.2.1.vsix'
npm run test:distribution
```

The runtime JSON uses the same fields as a compatibility-matrix `config` object. Supply only paths/JARs you trust and an EULA acceptance you already made. It is written only to the isolated test profile, never into the distributed example. Without that environment variable the runner does not launch Paper. `SKTESTLAB_ACCEPT_BUNDLE` can select another local download ZIP whose version matches package.json.

Checks verify ZIP checksums, reject escaping extraction paths, exclude local example settings, install through VS Code's CLI, confirm the product loads from the installed extensions directory, run offline checks and optional seven-assertion runtime example, generate an intentional failure, inspect dashboard expected/received evidence, switch all four built-in theme kinds, and export an actual failed JUnit report through the installed CLI. If an earlier VSIX is supplied, its saved run IDs must still appear in the upgraded dashboard. Uninstall is verified through the extension list. Portable input hashes must stay unchanged and runtime environment storage must be empty.

Logs and JSON evidence stay under `.vscode-test/distribution-*`. Windows CLI invocation uses argument arrays without a shell. Theme keyboard/narrow-layout browser checks are separate, recorded in verification.md. These automated checks do not replace independent beta feedback, a human setup/save-dialog walkthrough or a full screen-reader audit. Run again against the final 1.0.0 ZIP before publication.
