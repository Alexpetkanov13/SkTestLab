# SkTestLab 1.0.0 acceptance checklist

Release: **1.0.0**. This is a free MIT VS Code testing tool for the skUnity Skript Tools category. A Marketplace listing is optional for distributing a VSIX on skUnity.

## Completed

- [x] Native diagnostics, offline testing, runtime provider, dashboard and reports implemented.
- [x] 139 unit checks and six current-editor integration checks passed for 0.2.0.
- [x] Real Paper passing/failing/load-error/warning/cancellation cases verified.
- [x] Three real version pairings verified; 21 reward assertions passed.
- [x] Actual minimum VS Code 1.96.0 activation, discovery, diagnostics, offline execution and live dashboard checked.
- [x] Actual Restricted Mode activation/offline analysis checked; runtime and initialization blocked.
- [x] Owner selected MIT; license and package metadata updated.
- [x] Portable example, install guide, source/download packaging and checksums prepared.
- [x] skUnity description draft and current submission guidance reviewed.
- [x] Owner selected Windows-first support. Initial supported architecture is Windows x64; the VSIX target enforces `win32-x64`.
- [x] Candidate bundle install, portable offline/Paper tests, deliberate failure/JUnit export, 0.2.1 upgrade/history preservation and uninstall/file-preservation checks passed in isolated profiles.
- [x] Four native theme switches plus browser keyboard, 1280-pixel layout and 360-pixel embedded viewport checks completed. Fixed high-contrast light colors and added a skip link.

## Required before calling this 1.0.0

- [x] **Freeze the supported scope.** Windows x64 is the initial supported platform, declared in the VSIX and listing. Other operating systems and architectures remain uncertified.
- [x] **Windows runtime recovery milestone.** Repeated action cancellation, action timeout and abrupt owner-process termination were exercised on disposable Paper environments. Explicit recovery protects live/uncertain processes; ownership/path checks and unconfirmed shutdown preservation are covered by automated tests. Cross-platform behavior remains part of the platform gate.
- [x] **Close the version claim.** Only the three recorded Paper/Skript pairings are advertised as tested. Other 1.21 patches and 26.x are accepted targets requiring local verification, not certified combinations. No universal addon compatibility is claimed.
- [x] **Windows acceptance.** Installed 1.0.0 candidate from its ZIP; portable offline/Paper checks, seven reward assertions, deliberate failure/JUnit export, 0.2.1 upgrade/history preservation, uninstall and project hashes passed. Current/minimum/Restricted editors and four native theme switches passed. Isolated native setup pickers/Java/EULA cancellation and JSON Save As were exercised; the first-use report directory fix was reinstalled and verified.
- [x] **Independent beta feedback waived by the owner on 2026-10-23.** External reports remain optional; none are claimed. Final automated and local UI acceptance still apply.
- [x] **Public source/download and support established.** MIT source, GitHub Issues and an anonymously verified 0.5.0 download are live at Alexpetkanov13/SkTestLab. Publish and verify the exact final 1.0.0 artifacts separately.
- [x] **1.0.0 code acceptance.** Version set to 1.0.0; type/lint/format, 159 unit checks, seven native checks, minimum/trust checks, five real runtime scenarios, three-pairing matrix and interruption/recovery checks passed. Final archive/source reproducibility, exact download hash and publication results are recorded in the GitHub release evidence after freezing documentation.
- [ ] **skUnity submission review.** Replace draft download/support text, use exact version/support claims, upload owned icon/screenshots, verify anonymous download access and preview the post. The owner submits; staff approval is separate from completing 1.0.0.

## Good later features, not mandatory for this scoped 1.0

Full language semantics/type inference, automated player bots, arbitrary event simulation, a debugger, execution coverage, universal addon catalogs, typed runtime value capture, native upstream test adapters and Marketplace publication can follow 1.0. They must stay clearly excluded from initial release claims. The original broad product specification is larger than this scoped initial release.

## Release commands

```sh
npm ci
npm run format:check
npm run lint
npm run check
npm test
npm run test:integration
npm run test:minimum
npm run test:restricted
# After preparing a candidate ZIP:
npm run test:distribution
# Configure local accepted server/matrix paths before the following:
npm run test:runtime
npm run test:matrix
# Set SKTESTLAB_RELIABILITY_CONFIG to a local accepted runtime config:
npm run test:reliability
npm run release:prepare
```

The download ZIP includes VSIX, source ZIP, portable Reward Lab ZIP, MIT license, installation/testing guides, listing/BBCode, this checklist and SHA-256 checksums. Preparing it never uploads or publishes anything.
