import { expect, test, type Page } from "@playwright/test";

/** 첫 번째 필기 줄 위에 사선 한 획을 긋는다. 기기에 따라 마우스 또는 실제 터치 이벤트(CDP)를 사용한다. */
async function drawStroke(page: Page, lineIndex = 0, from = [0.1, 0.3], to = [0.4, 0.8]) {
  const canvas = page.locator(".writing-line .ink-live").nth(lineIndex);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return {
      x: box.x + box.width * (from[0] + (to[0] - from[0]) * t),
      y: box.y + box.height * (from[1] + (to[1] - from[1]) * t),
    };
  });
  const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  if (hasTouch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pts[0]] });
    for (const p of pts.slice(1)) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y);
    await page.mouse.up();
  }
}

/** 확정 스트로크 캔버스에서 잉크가 칠해진 픽셀 수 */
async function inkPixels(page: Page, lineIndex = 0, selector = ".stage .writing-line"): Promise<number> {
  return page.locator(selector).nth(lineIndex).locator("canvas.ink").first().evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
}

test("3단계 훈련을 마치고 결과를 비교할 수 있다", async ({ page }) => {
  await page.goto("/#practice-ko-word-hangeul");
  await expect(page.locator(".writing-line")).toHaveCount(1);
  await expect(page.locator(".guide-solid")).toHaveText("한글");

  // STEP 1: 따라 쓰기
  await drawStroke(page);
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(50);
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeEnabled();

  // STEP 2: 힌트 쓰기 — 점선 윤곽 가이드
  await page.locator("button.next").click();
  await expect(page.locator(".guide-outline")).toHaveCount(1);
  await expect(page.locator(".guide-solid")).toHaveCount(0);
  await drawStroke(page, 0, [0.5, 0.3], [0.8, 0.7]);

  // STEP 3: 혼자 쓰기 — 글씨 가이드 없음, 기준선만
  await page.locator("button.next").click();
  await expect(page.locator(".guide-text")).toHaveCount(0);
  await expect(page.locator(".rule-base")).toHaveCount(1);
  await drawStroke(page, 0, [0.2, 0.5], [0.9, 0.5]);

  // 이전 단계로 돌아가도 필기가 보존된다
  await page.locator('.step-tab[data-step="trace"]').click();
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(50);
  await page.locator('.step-tab[data-step="free"]').click();

  await page.locator("button.next").click();
  await expect(page).toHaveURL(/#compare$/);
  for (const step of ["trace", "hint", "free"]) {
    await expect.poll(() => inkPixels(page, 0, `.compare-row.step-${step} .writing-line`)).toBeGreaterThan(50);
  }
  await expect(page.locator(".compare-row.original .guide-solid")).toHaveText("한글");
});

test("되돌리기는 한 획씩, 전체 지우기는 모두 지운다", async ({ page }) => {
  await page.goto("/#practice-ko-char-ga");
  await expect(page.locator(".writing-line")).toHaveCount(1);
  await drawStroke(page, 0, [0.2, 0.2], [0.3, 0.8]);
  const one = await inkPixels(page);
  await drawStroke(page, 0, [0.5, 0.2], [0.8, 0.8]);
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(one);
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect.poll(() => inkPixels(page)).toBe(one);
  await page.getByRole("button", { name: "전체 지우기" }).click();
  await expect.poll(() => inkPixels(page)).toBe(0);
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeDisabled();
});

test("필기 중 페이지가 스크롤되지 않는다", async ({ page }) => {
  await page.goto("/#practice-ko-para-1");
  await expect(page.locator(".writing-line").first()).toBeVisible();
  await page.locator(".writing-line").nth(1).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  // 세로로 크게 긋는 획 — 터치라면 기본 동작은 스크롤이다
  await drawStroke(page, 1, [0.3, 0.05], [0.35, 0.95]);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect.poll(() => inkPixels(page, 1)).toBeGreaterThan(50);
});

test("화면 크기가 바뀌어도 필기가 같은 상대 위치에 다시 그려진다", async ({ page }) => {
  await page.goto("/#practice-ko-word-hangeul");
  await expect(page.locator(".writing-line")).toHaveCount(1);
  await drawStroke(page, 0, [0.1, 0.5], [0.3, 0.5]);
  const sampleAt = (fx: number, fy: number) =>
    page.locator(".stage canvas.ink").first().evaluate(
      (c: HTMLCanvasElement, [x, y]) => c.getContext("2d")!.getImageData(Math.round(c.width * x), Math.round(c.height * y), 1, 1).data[3],
      [fx, fy],
    );
  expect(await sampleAt(0.2, 0.5)).toBeGreaterThan(0);
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: Math.round(vp.width * 0.6), height: vp.height });
  await expect.poll(() => sampleAt(0.2, 0.5)).toBeGreaterThan(0);
  expect(await sampleAt(0.2, 0.2)).toBe(0);
});

test("글씨체를 손글씨로 바꿀 수 있다", async ({ page }) => {
  await page.goto("/#practice-ko-word-annyeong");
  await expect(page.locator(".guide-solid")).toBeVisible();
  await page.getByRole("radiogroup", { name: "글씨체" }).getByRole("radio", { name: "손글씨" }).click();
  await expect(page.locator(".guide-solid")).toHaveAttribute("font-family", /Nanum Pen Script/);
  const loaded = await page.evaluate(() => document.fonts.check('100px "Nanum Pen Script"', "안녕하세요"));
  expect(loaded).toBe(true);
});

test("직접 입력한 문장으로 연습할 수 있다", async ({ page }) => {
  await page.goto("/");
  await page.locator("#custom-text").fill("나만의 연습 문장");
  await page.getByRole("button", { name: "이 문장으로 연습" }).click();
  await expect(page).toHaveURL(/#practice-custom$/);
  await expect(page.locator(".guide-solid").first()).toBeVisible();
  const text = await page.locator(".guide-solid").allTextContents();
  expect(text.join(" ")).toBe("나만의 연습 문장");
});
