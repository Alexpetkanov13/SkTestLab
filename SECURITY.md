# Security

No project code runs automatically. Restricted workspaces can inspect source and run offline assertions. Java execution, runtime configuration and explicit file mutations require trust. Workspace executable overrides are not used before that check.

Targets must stay in the workspace after lexical/realpath validation. Server directories are disposable and ownership-checked. Processes use argument arrays, shell: false and hidden windows. Reports/dashboard values are escaped. The dashboard permits only nonce-gated packaged JavaScript/CSS, with narrowly scoped local resource roots and no remote scripts or command URIs. Messages use an explicit action allowlist; source navigation validates workspace ownership and real paths. Corrupt history entries are rejected before rendering. No telemetry, source upload or login.

Trusted scripts/JARs have the user's OS permissions. Directory isolation is not a sandbox. Correlation nonces protect against incidental logs, not hostile plugins reading the generated script. Plugins may write outside the environment or launch independent processes.

Heap/time limits and bounded logs mitigate ordinary faults. Runtime lifecycle records track host/editor/server PIDs. Explicit recovery protects live or uncertain processes, legacy/corrupt evidence and directory links; it revalidates ownership before and after claiming an inactive directory. An interrupted launch without a recorded server PID needs manual inspection. Recovery never kills a process. Cleanup deletes only validated owned directories after process closure.

For security reports, use the repository's private vulnerability reporting option if it is enabled: https://github.com/Alexpetkanov13/SkTestLab/security. Otherwise request a private reporting channel through GitHub Issues without posting vulnerability details. Private reporting availability has not been confirmed. Do not post credentials, exploit details or production world files publicly. Ordinary bug reports belong at https://github.com/Alexpetkanov13/SkTestLab/issues.
