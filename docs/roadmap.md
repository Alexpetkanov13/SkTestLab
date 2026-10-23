# Limitations and roadmap

1.0.0 includes offline analysis/testing, an interactive dashboard, explicit runtime recovery and isolated execution verified on three Paper/Skript combinations. It does not complete every requirement in the master product specification. The scoped initial release gates are tracked in [the 1.0 checklist](release-1.0.md).

## Runtime promotion gates

- A broader Paper/Skript compatibility matrix beyond the three recorded combinations, or narrower tested-version claims.
- Typed actual values and broader log formats. Observed Minecraft/Skript/Java versions, source mapping and multiline errors are implemented.
- Broader addon/platform stress verification. Windows real startup/action cancellation, timeout and owner-crash recovery are verified; explicit inactive-environment recovery is implemented.
- Linux/macOS acceptance. Minimum VS Code 1.96.0 and actual Restricted Mode are verified on Windows.

## Analysis and scale

Full scope/flow/type inference, function arity, provable undefined locals, global-variable collision intelligence, complete interpolation parsing, rich addon/version catalogs, whole-file indentation consistency, call references and dependency graphs remain future work. Revision caching is whole-document, not subtree-incremental. Benchmarking covers one 10,000-line file; multi-thousand-file responsiveness is not certified.

## Workflow

One test per JSON file, folder/file suite containers. Deferred: lazy discovery, parallel offline scheduling, impact suggestions, inferred function inputs, test-from-diagnostic commands, multi-suite definitions and native history trees. Related-file execution uses explicit targets. Runtime templates require manually chosen expectations.

Console context/exported functions are supported by the runtime implementation. Automated players/events, output assertions, expected runtime exceptions, upstream-native testing adapters, true debugging and execution coverage are deferred. Addon resources/configuration are not copied automatically.

## Publication

MIT licensing was selected by the owner and applied. The owner provided https://github.com/Alexpetkanov13/SkTestLab; GitHub Issues is configured as ordinary support. Source publication and actual release-asset availability must be verified separately. No Marketplace publication or skUnity submission occurred. A Marketplace listing is optional for skUnity VSIX distribution. Local VSIX/source/example/download ZIP generation, checksum/publication audits and clean-source rebuild checks are implemented. Signing/attestation remains a future release-pipeline decision.
