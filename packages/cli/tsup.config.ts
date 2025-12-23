import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  dts: false,
  entry: ["src/index.ts"],
  external: ["fs", "path", "url", "child_process"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  sourcemap: false,
  splitting: false,
  target: "node18",
  treeshake: true,
});
