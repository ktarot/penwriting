import { expect, test } from "@playwright/test";
import { PRACTICE_GUIDE, choose, drawStroke, inkPixels, onboard, openMine } from "./helpers";

test("최초 실행: 모국어를 고르면 화면 언어가 바뀌고, 설정이 저장된다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/#welcome$/);
  await choose(page, 0, "English");
  await expect(page.locator("h1")).toHaveText("Before you start");
  await choose(page, 1, "Japanese");
  // 학습 언어를 고르면 글씨체 미리보기가 그 언어로 바뀐다
  await expect(page.locator(".fonts .choice span").first()).toContainText("あいう");
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page.locator(".pair")).toHaveText("English speaker · learning Japanese");
  await expect(page.locator(".area-card .area-title")).toHaveText(["Letters", "Words", "Short sentences", "Long sentences", "My texts"]);
  await expect(page.locator(".draft-note")).toContainText("unreviewed");

  await page.reload();
  await expect(page).not.toHaveURL(/#welcome$/);
  await page.locator('.area-card[data-area="character"]').click();
  await expect(page.getByRole("tab", { name: /Katakana/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("단계별 발음·뜻 표시: 1단계 발음+뜻, 2단계 발음, 3단계 없음 (직접 켤 수 있음)", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.goto("/#practice-ja-word-01");
  const panel = page.locator(".info-panel");
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveText("ありがとう");
  await expect(panel.locator(".info-row.native")).toContainText("아리가토오");
  await expect(panel.locator(".info-row.native")).toContainText("근사 표기");
  await expect(panel.locator(".info-row.native")).toContainText("검수 전");
  await expect(panel.locator(".info-row.meaning")).toContainText("감사합니다");
  await drawStroke(page);

  await page.locator("button.next").click();
  await expect(panel.locator(".info-row.native")).toBeVisible();
  await expect(panel.locator(".info-row.meaning")).toHaveCount(0);
  await drawStroke(page);

  await page.locator("button.next").click();
  await expect(page.locator(".info-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "뜻" }).click();
  await expect(page.locator(".info-panel .info-row.meaning")).toContainText("고마워");
  await drawStroke(page);

  await page.locator("button.next").click();
  await expect(page).toHaveURL(/#compare$/);
  await expect.poll(() => inkPixels(page, 0, ".compare-row.step-free .writing-line")).toBeGreaterThan(30);
  await page.getByRole("button", { name: /다음 학습/ }).click();
  await expect(page).toHaveURL(/#practice-ja-word-02$/);
});

test("자모 단계: 문자 이름과 실제 소리를 구분해 보여 준다", async ({ page }) => {
  await onboard(page, "en", "ko", "Korean");
  await page.goto("/#practice-ko-cons-01");
  const panel = page.locator(".info-panel");
  await expect(panel.locator(".info-row.name")).toContainText("기역");
  await expect(panel.locator(".info-row.name")).toContainText("(giyeok)");
  await expect(panel.locator(".info-row.standard dt")).toHaveText("Sound");
  await expect(panel.locator(".info-row.standard")).toContainText("[k]");
  await expect(panel.locator(".info-row.native")).toContainText("g/k");
});

test("일본어 손글씨 글꼴과 베트남어 성조 문자를 렌더링한다", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.goto("/#practice-ja-hira-a");
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveAttribute("font-family", /Noto Sans JP/);
  await page.getByRole("radiogroup", { name: "기본 글씨체" }).getByRole("radio", { name: "손글씨" }).click();
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveAttribute("font-family", /Klee One/);
  expect(await page.evaluate(() => document.fonts.check('600 100px "Klee One"', "あ"))).toBe(true);

  await page.goto("/#options");
  await choose(page, 1, "베트남어");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).not.toHaveURL(/#options$/);
  await page.goto("/#area-character");
  await expect(page.getByRole("tab", { name: /성조 기호/ })).toBeVisible();
  await page.goto("/#practice-vi-w-places-02");
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveText("xe buýt");
  await expect(page.locator(".info-row.note")).toContainText("ngang");
  expect(await page.evaluate(() => document.fonts.check('400 100px "Noto Sans"', "ảãạ"))).toBe(true);
});

test("사용자 입력 문장은 학습 언어로 연습하고 발음 안내를 만들지 않는다", async ({ page }) => {
  await onboard(page, "ko", "vi", "베트남어");
  await openMine(page);
  await page.locator("#custom-text").fill("Chúc mừng năm mới");
  await page.getByRole("button", { name: "이 문장으로 연습" }).click();
  await expect(page.locator(PRACTICE_GUIDE).first()).toHaveAttribute("lang", "vi");
  await expect(page.locator(".info-panel")).toHaveCount(0);
  // 언어팩 정보가 없으므로 발음·뜻 버튼은 없고 듣기만 있다
  await expect(page.locator(".info-toggles .toggle:not([hidden])")).toHaveCount(0);
  await expect(page.locator(".info-toggles .listen")).toHaveCount(1);
});
