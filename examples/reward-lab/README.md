# Reward Lab

Open this folder (`examples/reward-lab`) as its own VS Code folder so the test targets resolve to `reward.sk`.

In SkTestLab's Test Explorer, run `offline.sktest.json` for static checks or `runtime.sktest.json` to call the function on an isolated Paper server. Runtime testing requires your configured Java, Paper and Skript paths and accepted Minecraft EULA. No addons are required.

The runtime test checks normal rewards, double rewards, zero tasks, negative inputs, rounding and the 1000-coin cap. To see an assertion failure, change the first expected condition from `50` to `51`, run again, then restore it.

For a manual in-game check, load `reward.sk` and run `/labreward 5`. The expected reply is 50 coins. This command previews a calculation; it does not deposit money into an economy plugin.
