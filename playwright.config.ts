import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// 미리 설치된 Chromium이 있는 환경(클라우드 컨테이너 등)에서는 그것을 사용한다.
const preinstalled = process.env.PW_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const launchOptions = existsSync(preinstalled) ? { executablePath: preinstalled } : {};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:4173", launchOptions },
  webServer: {
    command: "npx vite build && npx vite preview --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-android", use: { ...devices["Pixel 7"] } },
  ],
});
