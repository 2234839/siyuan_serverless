import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server_proxy.ts"],
  outDir: "dist/server",
  splitting: false,
  sourcemap: false,
  clean: true,
  target: "es2020",
  minify: false,
  treeshake: true,
  /** 打包所有模块 */
  noExternal: [/.*/],
  platform: "node",
});
