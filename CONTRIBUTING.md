# Contributing

Use Node 24 LTS and npm ci. Run format:check, lint, check, test and test:integration before sending changes. Integration tests download VS Code; Linux needs Xvfb. Package with npm run package.

Keep core independent of vscode. Add rule fixtures and Quick Fix regression tests. Parser success must not imply runtime success. Preserve unknown addon syntax and label heuristics. Record real runtime versions and distinguish mocked evidence from actual servers.

Do not add placeholder commands, broad automatic rewrites, telemetry or fictitious Debug/Coverage profiles. Never accept the Minecraft EULA on someone else's behalf. Do not mutate production server directories. Use safe process arguments with shell: false.

The project is MIT licensed; see LICENSE.txt. Contributions must be compatible with those terms. Official references are in docs/research.md. Run test:minimum and test:restricted for editor/trust changes. Preparing release bundles also requires Python 3; release:prepare stays local and does not publish.
