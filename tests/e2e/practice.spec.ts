import { expect, test } from "@playwright/test";
import { PRACTICE_GUIDE, PRACTICE_LINE, drawStroke, inkPixels, onboard, openMine, repeatsFor } from "./helpers";

// 펜글씨 모드: 한국어 사용자가 한국어를 연습
test.beforeEach(async ({ page }) => {
  await onboard(page, "ko", "ko", "한국어");
});

test("3단계 훈련을 마치고 결과를 비교할 수 있다", async ({ page }) => {
  await page.goto("/#practice-ko-word-01");
  await expect(page.locator(PRACTICE_LINE)).toHaveCount(repeatsFor(page));
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveText("사람");

  // STEP 1: 따라 쓰기
  await drawStroke(page);
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(50);
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeEnabled();

  // STEP 2: 힌트 쓰기 — 점선 윤곽 가이드
  await page.locator("button.next").click();
  await expect(page.locator(`${PRACTICE_LINE} .guide-outline`)).toHaveCount(repeatsFor(page));
  await expect(page.locator(PRACTICE_GUIDE)).toHaveCount(0);
  await drawStroke(page, 0, [0.5, 0.3], [0.8, 0.7]);

  // STEP 3: 혼자 쓰기 — 글씨 가이드 없음, 기준선만
  await page.locator("button.next").click();
  await expect(page.locator(".guide-text")).toHaveCount(0);
  await expect(page.locator(`${PRACTICE_LINE} .rule-base`)).toHaveCount(repeatsFor(page));
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
  await expect(page.locator(".compare-row.original .guide-solid").first()).toHaveText("사람");
});

test("되돌리기는 한 획씩, 전체 지우기는 모두 지운다", async ({ page }) => {
  await page.goto("/#practice-ko-syl-01");
  await expect(page.locator(PRACTICE_LINE)).toHaveCount(repeatsFor(page));
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
  await page.goto("/#practice-ko-para-01");
  await expect(page.locator(PRACTICE_LINE).first()).toBeVisible();
  await page.locator(PRACTICE_LINE).nth(1).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  // 세로로 크게 긋는 획 — 터치라면 기본 동작은 스크롤이다
  await drawStroke(page, 1, [0.3, 0.05], [0.35, 0.95]);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await expect.poll(() => inkPixels(page, 1)).toBeGreaterThan(50);
});

test("화면 크기가 바뀌어도 필기가 같은 상대 위치에 다시 그려진다", async ({ page }) => {
  await page.goto("/#practice-ko-word-01");
  await expect(page.locator(PRACTICE_LINE)).toHaveCount(repeatsFor(page));
  await drawStroke(page, 0, [0.1, 0.5], [0.3, 0.5]);
  const sampleAt = (fx: number, fy: number) =>
    page.locator(`${PRACTICE_LINE} canvas.ink`).first().evaluate(
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
  await page.goto("/#practice-ko-short-01");
  await expect(page.locator(PRACTICE_GUIDE).first()).toBeVisible();
  await page.getByRole("radiogroup", { name: "글씨체" }).getByRole("radio", { name: "손글씨" }).click();
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveAttribute("font-family", /Nanum Pen Script/);
  const loaded = await page.evaluate(() => document.fonts.check('100px "Nanum Pen Script"', "안녕하세요"));
  expect(loaded).toBe(true);
});

test("직접 입력한 문장으로 연습할 수 있다", async ({ page }) => {
  await openMine(page);
  await page.locator("#custom-text").fill("나만의 연습 문장");
  await page.getByRole("button", { name: "이 문장으로 연습" }).click();
  await expect(page).toHaveURL(/#practice-custom$/);
  await expect(page.locator(PRACTICE_GUIDE).first()).toBeVisible();
  const text = await page.locator(PRACTICE_GUIDE).allTextContents();
  expect(text.join(" ")).toBe("나만의 연습 문장");
});
