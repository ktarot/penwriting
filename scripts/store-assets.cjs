// Play 스토어용 이미지 생성: 그래픽 이미지(1024×500)와 휴대폰·태블릿 스크린샷.
// 사용: npm run build && npx vite preview --port 4173 &  →  node scripts/store-assets.cjs
const { chromium, devices } = require("playwright");
const fs = require("fs");
const BASE = process.env.BASE_URL || "http://localhost:4173/";
const OUT = "store";

async function onboard(page, nativeLabel, learningLabel) {
  await page.goto(BASE);
  await page.locator("fieldset").nth(0).locator("label.choice", { hasText: new RegExp(`^${nativeLabel}$`) }).click();
  await page.locator("fieldset").nth(1).locator("label.choice", { hasText: new RegExp(`^${learningLabel}$`) }).click();
  await page.locator('button[type="submit"]').click();
  await page.locator(".area-grid").waitFor();
}

/** 연습 칸에 손글씨처럼 획을 그린다 (스크린샷용 예시) */
async function scribble(page, lineIndex, strokes) {
  const box = await page.locator(".stage .writing-line:not(.model-line) .ink-live").nth(lineIndex).boundingBox();
  for (const pts of strokes) {
    await page.mouse.move(box.x + box.width * pts[0][0], box.y + box.height * pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 6 });
    await page.mouse.up();
  }
}

(async () => {
  const pre = process.env.PW_CHROMIUM_PATH || "/opt/pw-browsers/chromium";
  const b = await chromium.launch(fs.existsSync(pre) ? { executablePath: pre } : {});
  fs.mkdirSync(`${OUT}/screenshots`, { recursive: true });

  // 그래픽 이미지
  const icon = fs.readFileSync("public/icons/icon.svg", "utf8").replace("<svg ", '<svg width="200" height="200" ');
  const fg = await b.newPage({ viewport: { width: 1024, height: 500 } });
  await fg.setContent(`<html><body style="margin:0;width:1024px;height:500px;background:#2f5d50;display:flex;align-items:center;gap:56px;padding:0 72px;box-sizing:border-box;font-family:system-ui,'Noto Sans KR','Noto Sans JP',sans-serif;color:#fffdf7">
    <div style="flex:none;filter:drop-shadow(0 12px 24px rgba(0,0,0,.25))">${icon}</div>
    <div><div style="font-size:76px;font-weight:800;letter-spacing:-1px">PenWriting</div>
    <div style="font-size:30px;margin-top:8px;opacity:.92">따라 쓰고 · 힌트 보고 · 혼자 쓰기</div>
    <div style="font-size:52px;margin-top:22px;letter-spacing:14px;color:#e9c46a">가 A あ ă</div></div></body></html>`);
  await fg.screenshot({ path: `${OUT}/feature-graphic.png` });

  // 휴대폰
  // 1080×1920 (9:16) — Play 스토어는 긴 변이 짧은 변의 2배를 넘으면 받지 않는다
  const phone = await b.newContext({ ...devices["Pixel 7"], viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, reducedMotion: "reduce" });
  const p = await phone.newPage();
  await onboard(p, "한국어", "일본어");
  await p.screenshot({ path: `${OUT}/screenshots/phone-1-home.png` });
  await p.goto(`${BASE}#area-word`);
  await p.getByRole("tab", { name: /주소/ }).click();
  await p.screenshot({ path: `${OUT}/screenshots/phone-2-words.png` });
  await p.goto(`${BASE}#practice-ja-hira-a`);
  await p.locator(".stroke-order").waitFor();
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/screenshots/phone-3-stroke-order.png` });
  await p.goto(`${BASE}#practice-ja-qa-04-q`);
  await p.locator(".stage .writing-line").first().waitFor();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/screenshots/phone-4-sentence.png` });

  // 10인치 태블릿 가로 (2560×1600)
  const tab = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: "reduce" });
  const t = await tab.newPage();
  await onboard(t, "한국어", "일본어");
  await t.screenshot({ path: `${OUT}/screenshots/tablet-1-home.png` });
  await t.goto(`${BASE}#practice-ja-hira-nu`);
  await t.locator(".stroke-order").waitFor();
  await t.waitForTimeout(600);
  await scribble(t, 0, [
    [[0.33, 0.33], [0.36, 0.5], [0.42, 0.66], [0.47, 0.72]],
    [[0.52, 0.25], [0.48, 0.45], [0.38, 0.66], [0.33, 0.7], [0.3, 0.6], [0.4, 0.45], [0.55, 0.4], [0.66, 0.48], [0.66, 0.62], [0.58, 0.7], [0.52, 0.66], [0.58, 0.6], [0.7, 0.68], [0.75, 0.74]],
  ]);
  await t.screenshot({ path: `${OUT}/screenshots/tablet-2-practice.png` });
  await t.goto(`${BASE}#area-long`);
  await t.screenshot({ path: `${OUT}/screenshots/tablet-3-long.png` });
  await b.close();
  console.log("store assets written to", OUT);
})();
