# Install SkTestLab

SkTestLab is a **VS Code extension**, not a server plugin. Do not put the VSIX in your Minecraft `plugins` folder.

The initial release supports **Windows x64** with VS Code 1.96+. The VSIX declares `win32-x64`; other platforms/architectures are not certified. A matching Skript release and the Java version required by your Paper server are still needed for runtime tests.

1. Extract the download ZIP. Keep `LICENSE.txt` and optionally verify files against `SHA256SUMS.txt`.
2. In VS Code 1.96 or newer, open Extensions, choose **… → Install from VSIX**, and select the included `sktestlab-win32-x64-<version>.vsix`.
3. Extract `reward-lab.zip`. Open its `reward-lab` folder as a workspace. Existing VS Code windows can stay open; use **File → New Window** first if preferred.
4. Open Testing, discover tests, and run **Reward script has no static diagnostics**. It needs no Minecraft server or Java installation.
5. To execute the reward function, use **SkTestLab: Configure Runtime** in a trusted workspace. Select compatible local Paper and Skript JARs and the Java executable required by that Paper version. Read and accept Minecraft's EULA yourself. No server/plugin JARs or preaccepted EULA are included.
6. Run **Reward calculation handles bonuses, limits and invalid input**. Cold server startup can take several minutes. Open **SkTestLab: Open Dashboard** for results and version evidence.

Use the dashboard's **Theme** menu for **White**, **Dark**, or **Follow VS Code**. Your dashboard choice is remembered in the current VS Code profile. The editor theme stays unchanged. The included BETA-TESTING.md provides a walkthrough and feedback checklist for independent testers.

Minecraft 1.21+ is the runtime baseline. Each Skript release must support your exact Paper version; addons have their own compatibility requirements. Offline success checks source expectations only. Runtime results require a real server. See the included source documentation for the tested matrix and limitations.

## Updating and removing

Install a newer VSIX the same way and reload VS Code if prompted. Use Extensions → SkTestLab → Uninstall to remove it. Workspace scripts and test definitions remain your files. Run history lives in VS Code extension global storage. Use **SkTestLab: Recover Runtime Environments** to inspect leftovers and remove verified inactive environments. Live, legacy and uncertain environments remain protected for manual inspection; no automatic deletion occurs.

## Troubleshooting

- **Accept the Minecraft EULA:** runtime acceptance is a SkTestLab setting in the active profile/workspace. Accept through Configure Runtime after reading the EULA.
- **Java version error:** select a suitable Java executable; Java 21 is the minimum, and newer Paper releases can require a newer Java version.
- **Missing syntax/addon:** configure required addon JARs and list every dependent `.sk` target in the test. Static analysis does not validate every addon expression.
- **Targets cannot be found:** targets are relative to the owning workspace folder. Open the extracted `reward-lab` folder directly.
- **Runtime blocked in Restricted Mode:** review the project before trusting it. Offline tests remain available.
- **A failed or errored test:** expand the dashboard result and inspect assertions, original source diagnostics and console output. Never treat an errored/cancelled/skipped test as a pass.

Source ZIP: extract, install Node.js 24 and Python 3, then run `npm ci`. Build/check commands are documented in README.md. You must obtain Paper/Skript separately from their official sources for runtime testing.
