# Official references reviewed

Reviewed 2026-10-23. These references informed implementation; they do not certify arbitrary runtime versions.

- [VS Code Testing API](https://code.visualstudio.com/api/extension-guides/testing): native controllers, profiles and states.
- [Extension-host testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension): official CLI/Electron runner.
- [Paper setup](https://docs.papermc.io/paper/getting-started/): Java requirements and JAR startup.
- [Skript upstream](https://github.com/SkriptLang/Skript): development test infrastructure depends on a server; its specialized constructs are not assumed available in normal plugin builds.
- [Skript structures](https://docs.skriptlang.org/structures.html): command/trigger shape and local functions introduced in 2.7.
- [Skript logging source](https://github.com/SkriptLang/Skript/blob/master/src/main/java/ch/njol/skript/effects/EffLog.java): ordinary logging instead of a permanent companion plugin.

Imports are checked against official @types/vscode 1.96 declarations. Actual selected JAR syntax still requires runtime verification.
