import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { serviceWorker } from "./pwa/vite-plugin-sw";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "artifact" ? [] : [serviceWorker()],
  resolve: {
    // artifact 모드: 글꼴 번들 대신 Google Fonts 링크 사용 (단일 HTML 파일로 묶기 위해)
    alias:
      mode === "artifact"
        ? [{ find: /^\.\/fonts-bundled$/, replacement: fileURLToPath(new URL("./src/app/fonts-none.ts", import.meta.url)) }]
        : [],
  },
  build:
    mode === "artifact"
      ? { outDir: "dist-artifact", assetsInlineLimit: 100_000_000, modulePreload: false, copyPublicDir: false, rollupOptions: { output: { inlineDynamicImports: true } } }
      : {},
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
}));
