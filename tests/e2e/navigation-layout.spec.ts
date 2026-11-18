import { expect, test } from "@playwright/test";
import { PRACTICE_LINE, drawStroke, inkPixels, onboard, repeatsFor } from "./helpers";

test("첫 설정 → 홈(영역 카드) → 영역(주제 탭) → 연습, 뒤로 가기", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await expect(page).toHaveURL(/\/(#)?$/);
  await expect(page.locator(".area-card .area-title")).toHaveText(["글자", "단어", "짧은 문장", "긴 문장", "내 문장"]);
  await expect(page.locator(".bottom-nav .nav-item.active")).toHaveText("홈");
  // 첫 설정 화면으로는 뒤로 가기로 돌아가지 않는다
  await page.goBack().catch(() => undefined);
  await expect(page).not.toHaveURL(/#welcome$/);

  await page.goto("/");
  await page.locator('.area-card[data-area="word"]').click();
  await expect(page).toHaveURL(/#area-word$/);
  await expect(page.locator(".app-bar-title")).toHaveText("단어");
  const tabs = page.getByRole("tablist", { name: "단어" });
  await expect(tabs.getByRole("tab")).toHaveCount(14);
  await tabs.getByRole("tab", { name: /주소/ }).click();
  await expect(page.locator('a[href="#practice-ja-w-address-address"]')).toBeVisible();
  await expect(page.locator('a[href="#practice-ja-w-numbers-zero"]')).toHaveCount(0);
  // 키보드로 탭 이동
  await tabs.getByRole("tab", { name: /주소/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: /시간·날짜/ })).toHaveAttribute("aria-selected", "true");

  // 연습 → 앱 막대 [뒤로] → 영역 → [뒤로] → 홈
  await page.locator('a[href="#practice-ja-w-time-second-t"]').click();
  await expect(page.locator(".app-bar-title .src")).toHaveText("秒");
  await page.getByRole("button", { name: "뒤로" }).click();
  await expect(page).toHaveURL(/#area-word$/);
  // 마지막 주제 탭을 기억한다
  await expect(tabs.getByRole("tab", { name: /시간·날짜/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "뒤로" }).click();
  await expect(page.locator(".area-grid")).toBeVisible();
});

test("링크로 바로 연 연습 화면의 [뒤로]는 그 영역으로 간다", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.goto("/#practice-ja-qa-01-q");
  await page.reload();
  await page.getByRole("button", { name: "뒤로" }).click();
  await expect(page).toHaveURL(/#area-short$/);
});

test("아래 메뉴: 홈 · 기록 · 설정, 설정에서 앱 정보(개인정보처리방침·라이선스)", async ({ page }) => {
  await onboard(page, "en", "ko", "Korean");
  const nav = page.getByRole("navigation", { name: "Main menu" });
  await nav.getByRole("link", { name: "Log" }).click();
  await expect(page).toHaveURL(/#history$/);
  await expect(nav.getByRole("link", { name: "Log" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator("#privacy")).toContainText("does not collect personal information");
  await expect(page.locator("#licenses")).toContainText("KanjiVG");
  await expect(page.locator("#licenses")).toContainText("SIL Open Font License");
  await expect(page.locator(".about-head")).toContainText(/Version \d+\.\d+\.\d+/);
  // 연습 화면에서는 아래 메뉴를 숨겨 필기 공간을 넓힌다
  await page.goto("/#practice-ko-cons-01");
  await expect(page.locator(PRACTICE_LINE).first()).toBeVisible();
  await expect(page.locator(".bottom-nav")).toHaveCount(0);
});

test("생활 단어·질문과 답·긴 문장 내용", async ({ page }) => {
  await onboard(page, "ko", "en", "영어");
  await page.goto("/#area-short");
  await page.getByRole("tab", { name: /질문과 답/ }).click();
  await expect(page.locator(".item-link").first().locator(".item-text")).toHaveText("What's your name?");
  await expect(page.locator(".item-link").first().locator(".item-sub")).toHaveText("이름이 뭐예요?");
  await page.goto("/#practice-en-w-numbers-one");
  await expect(page.locator(".info-row.meaning")).toContainText("일");
  await expect(page.locator(".info-row.native")).toContainText("원");
  await page.goto("/#practice-en-notice-02");
  await expect(page.locator(".info-row.meaning")).toContainText("엘리베이터");
  // 문장에는 모국어 근사 발음 표기를 붙이지 않는다 (듣기로 대신)
  await expect(page.locator(".info-row.native")).toHaveCount(0);
});

test("좁은 화면: 글자·단어는 원본/연습/원본/연습, 문장은 원본/연습", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.goto("/#practice-ja-word-01");
  const compact = repeatsFor(page) === 2;
  await expect(page.locator(PRACTICE_LINE)).toHaveCount(compact ? 2 : 1);
  const kinds = await page.locator(".stage > .writing-line").evaluateAll((els) => els.map((e) => (e.classList.contains("model-line") ? "원본" : "연습")));
  expect(kinds).toEqual(compact ? ["원본", "연습", "원본", "연습"] : ["연습"]);
  if (compact) {
    await drawStroke(page, 1);
    await expect.poll(() => inkPixels(page, 1)).toBeGreaterThan(30);
    expect(await inkPixels(page, 0)).toBe(0);
  }
  await page.locator('.step-tab[data-step="free"]').click();
  await expect(page.locator(".stage .model-line")).toHaveCount(0);

  await page.goto("/#practice-ja-qa-01-q");
  const sentKinds = await page.locator(".stage > .writing-line").evaluateAll((els) => els.map((e) => (e.classList.contains("model-line") ? "원본" : "연습")));
  const lines = sentKinds.filter((k) => k === "연습").length;
  expect(sentKinds).toEqual(compact ? Array.from({ length: lines }, () => ["원본", "연습"]).flat() : Array(lines).fill("연습"));
});

test("일본어 기초 문자에 획순(번호·시작점·방향)을 보여 준다", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.goto("/#practice-ja-hira-a");
  const so = page.locator(".stroke-order");
  await expect(so).toBeVisible();
  await expect(so.locator(".so-ink")).toHaveCount(3);
  await expect(so.locator(".so-credit a")).toHaveAttribute("href", "https://kanjivg.tagaini.net");
  await expect(so.locator(".so-count")).toHaveText("3 / 3", { timeout: 8000 });
  await expect(so.locator(".so-num")).toHaveText(["1", "2", "3"]);
  await expect(so.locator(".so-arrow")).toHaveCount(3);
  await so.getByRole("button", { name: "다음 획" }).click();
  await expect(so.locator(".so-count")).toHaveText("1 / 3");
  await page.locator('.step-tab[data-step="free"]').click();
  await expect(page.locator(".stroke-order")).toHaveCount(0);
  await page.getByRole("button", { name: "획순" }).click();
  await expect(page.locator(".stroke-order")).toBeVisible();
  await page.goto("/#practice-ja-kanji-09");
  await expect(page.locator(".stroke-order .so-ink")).toHaveCount(4);
});

test("획순 데이터가 없는 언어에는 획순을 만들지 않는다", async ({ page }) => {
  await onboard(page, "ja", "ko", "韓国語");
  await page.goto("/#practice-ko-cons-01");
  await expect(page.locator(PRACTICE_LINE).first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator(".stroke-order")).toHaveCount(0);
  await expect(page.locator(".stroke-toggle")).toBeHidden();
});
