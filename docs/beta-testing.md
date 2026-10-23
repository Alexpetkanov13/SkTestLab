# SkTestLab beta acceptance

This checklist is for independent testers of the Windows x64 candidate. Keep reports tied to the exact VSIX version and SHA-256 checksum. Do not test untrusted scripts or use a production Minecraft world.

1. Extract the download ZIP and follow INSTALL.md in a new VS Code window/profile. Record whether any installation step is unclear. You should not need Node or Python to use the extension.
2. Open the portable Reward Lab folder and run its offline test. Open the dashboard and switch **Theme → White**, then **Dark**. Close/reopen it to check the choice persists. Try **Follow VS Code** with a light, dark and high-contrast editor theme.
3. Use Tab/Enter and the skip link to navigate. Press `/` for search and Escape to clear. Try filters, sorting, expanded assertions and a narrow editor panel. Report clipped controls or unreadable text.
4. Configure Runtime through its actual dialogs using compatible local Paper/Skript/Java files. Read and accept the Minecraft EULA yourself. Run the reward runtime test; expect seven passing assertions.
5. Change an expected reward from 50 to 51. Confirm a failure, inspect expected/received details and source navigation, then restore the expectation. Use the Export report button to save JSON, HTML and JUnit through the real dialogs and open the saved files.
6. Cancel a runtime test. Review the log and confirm the test is cancelled rather than passed. If an environment remains, inspect it with Recover Runtime Environments; do not manually delete a directory used by a live server.
7. Upgrade from a prior candidate and check that saved history/settings remain. Uninstall and confirm your own scripts/test definitions remain.

## Feedback to return

Copy this section into the chosen support channel or use the beta-feedback issue template once the public repository is available:

- Candidate version and downloaded file checksum:
- Windows/architecture and VS Code version:
- Java, Paper, Skript and addon versions (if testing runtime):
- Which numbered steps were completed:
- What you expected and what actually happened:
- Exact reproduction steps and smallest safe script/test fixture:
- Setup/export dialog feedback:
- Theme, keyboard and narrow-layout observations:
- Upgrade/uninstall observations:
- Blocking problem, minor issue, suggestion, or no issues found:

Attach only sanitized logs/screenshots. Do not include credentials, private paths you want kept private, production worlds or unrelated project files. Internal automated checks are recorded separately and do not count as independent feedback. No testers have been contacted automatically.
