# Public hosting handoff

Repository: https://github.com/Alexpetkanov13/SkTestLab

Ordinary support and beta feedback: https://github.com/Alexpetkanov13/SkTestLab/issues

Downloads: https://github.com/Alexpetkanov13/SkTestLab/releases

The initial scope is Windows x64; only the three recorded Paper/Skript pairings are advertised as tested. Licensing is MIT, chosen by the owner. Keep LICENSE.txt with redistributed software. Contributions must be compatible with MIT; no contributor agreement or copyright transfer is imposed by this project.

## Prepared source

The release ZIP includes source, the VSIX, a portable example, checksums and beta instructions. The source archive excludes local editor/EULA settings, test profiles, server/plugin JARs and build dependencies. Run `npm run test:source-release` to unpack it into a clean directory, install locked dependencies, check/lint/test/build and compare emitted JavaScript/source maps against the actual VSIX.

`python scripts/audit-release.py <download.zip> <report.json>` verifies checksums and scans nested archives for private/build artifacts, escaping paths, known credential patterns and personal Windows profile paths. Reports contain file names and finding types, not matched secret values. This is a bounded pattern audit, not a guarantee that every possible sensitive value can be detected. Audit tests use synthetic fixtures only.

## Publication sequence

1. Push the reviewed MIT source to the owner-provided repository without force-pushing existing history.
2. Wait for the Quality workflow. Packaging runs on Windows and checks the installable Windows x64 candidate; real Minecraft workflows need an explicitly provisioned runner and accepted EULA.
3. Publish a clearly labeled candidate GitHub Release only after reviewing the source and build results. Attach the matching download ZIP and SHA256SUMS.txt, plus the VSIX if desired. Do not bundle Paper, Skript or addon JARs.
4. Verify the exact release asset downloads anonymously and its hash matches. A releases-page URL alone does not prove an artifact has been uploaded.
5. Independent beta feedback was waived by the owner on 2026-10-23. Optional reports remain welcome; do not invent external acceptance. No automated outreach is included.
6. Complete the final 1.0 checklist before changing the release/listing to 1.0.0 or submitting on skUnity.

The skUnity listing contains real source/support/download links. The 1.0.0 checklist records the owner-waived feedback requirement and final acceptance evidence. Publishing source, attaching a GitHub Release and submitting on skUnity are separate actions; verify each result explicitly.
