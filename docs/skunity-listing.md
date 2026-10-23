# skUnity listing — 1.0.1

Category: **Skript Tools**

Title: **SkTestLab — Skript Testing & Diagnostics for VS Code**

Tagline: **Write Skript. Run real tests. Ship with confidence.**

Version: use the exact included VSIX version. Current release is **1.0.1**.

Price/license: **Free · MIT open source**

## What it does

SkTestLab brings repeatable Skript checks into VS Code's native Test Explorer. Analyze source, write `.sktest.json` expectations, run offline checks or launch an isolated Paper server, and inspect saved results in the dashboard.

- Twelve configurable source diagnostic rules and targeted Quick Fixes.
- Offline assertions for diagnostics, symbols, source and structure.
- Real runtime assertions through your selected Paper/Skript JARs.
- Test discovery, cancellation, failed-test reruns and local run history.
- Dashboard with assertion evidence, filters, sorting, comparable-selection trends and observed runtime versions.
- JSON, HTML and JUnit reports.
- MIT source and a small working example included. No account or telemetry required.

## Requirements and supported versions

Windows x64 and VS Code 1.96+. The VSIX targets `win32-x64`; Linux, macOS and Windows ARM64 are not certified. Offline checks do not require Minecraft or Java. Runtime checks require a trusted workspace, Minecraft EULA acceptance, compatible Paper/Skript JARs and suitable Java.

The runtime targets Minecraft 1.21+ with a matching Skript release. Select **2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15, 2.16 and 2.17** in the skUnity minor-version field. Exact verified pairings: Paper 1.21 build 130 / Skript 2.9.0; Paper 1.21.4 build 232 / Skript 2.10.0, 2.11.0, 2.12.0 or 2.13.0; Paper 1.21.11 build 132 / Skript 2.14.0, 2.15.0, 2.16.0, 2.17.0 or 2.17.1. Each passed seven real reward assertions using Java 21.0.12. Other patches/pairings/addons, including 26.x servers, need local verification. See docs/compatibility.md.

## Installation and first test

Download and extract the ZIP, install its VSIX through VS Code's Extensions menu, then open the extracted Reward Lab folder. Run the offline test first. Configure Runtime for actual Paper execution. The example checks seven reward scenarios without addons. See `INSTALL.md` for full instructions.

## Limits

Offline checks are structural heuristics, not a complete Skript parser. Runtime tests use console context and exported functions; automated players, interactive events, debugging and coverage are not included. Scripts/JARs run with your OS permissions. Temporary directories protect production worlds from accidental reuse but are not a security sandbox. English runtime diagnostics are tested. Do not advertise universal addon or version support.

## Download, source and support

Source: https://github.com/Alexpetkanov13/SkTestLab

Download ZIP: https://github.com/Alexpetkanov13/SkTestLab/releases/download/v1.0.1/sktestlab-1.0.1-download.zip

Release notes: https://github.com/Alexpetkanov13/SkTestLab/releases/tag/v1.0.1

Support and feedback: https://github.com/Alexpetkanov13/SkTestLab/issues

Before submission, verify that the intended release asset is actually published and downloads without an account, ad delays or surveys. The releases-page link is not proof that an asset exists. Upload the provided icon and screenshots through the resource editor and preview the listing. No third-party server/plugin JARs are redistributed. Use SKUNITY-DESCRIPTION.bbcode for a copy-ready resource description. The owner previews and submits the post; staff approval is separate.

Official submission references, reviewed 2026-10-23: [About Resources](https://docs.skunity.com/guides/guide/about-resources.21), [How to Submit](https://docs.skunity.com/guides/guide/how-to-submit-resources.22), [Resource Standards](https://docs.skunity.com/guides/guide/resource-standards.23). Staff review is required; this draft does not imply approval.
