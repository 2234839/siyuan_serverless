import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/client_proxy.ts"],
  outDir: "dist/client",
  splitting: false,
  sourcemap: false,
  clean: true,
  target: "es2020",
  minify: false,
  treeshake: true,
  /** 打包所有模块 */
  noExternal: [/.*/],
  platform: "browser",
  format: "iife",
});
