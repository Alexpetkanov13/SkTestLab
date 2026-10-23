import { build } from "esbuild";
await build({
  entryPoints: ["src/extension.ts", "src/cli.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outdir: "dist",
  external: ["vscode"],
  sourcemap: true,
  minify: true,
});
