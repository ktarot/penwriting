import { expect, test } from "@playwright/test";
import { PRACTICE_LINE, drawStroke, inkPixels, onboard, repeatsFor } from "./helpers";

test("학습 단위 탭: 한 번에 한 묶음만 보이고, 마지막 탭을 기억한다", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  const tabs = page.getByRole("tablist", { name: "학습 단위" });
  await expect(tabs.getByRole("tab")).toHaveText(["기초 문자", "단어", "문장", "단락", "내 문장"]);
  await expect(tabs.getByRole("tab", { name: "기초 문자" })).toHaveAttribute("aria-selected", "true");
  // 기초 문자 안의 분류 탭
  await expect(page.getByRole("tab", { name: /히라가나/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('a[href="#practice-ja-hira-a"]')).toBeVisible();
  await expect(page.locator('a[href="#practice-ja-word-01"]')).toHaveCount(0);

  await page.getByRole("tab", { name: /가타카나/ }).click();
  await expect(page.locator('a[href="#practice-ja-kata-a"]')).toBeVisible();
  await expect(page.locator('a[href="#practice-ja-hira-a"]')).toHaveCount(0);

  await tabs.getByRole("tab", { name: "문장", exact: true }).click();
  await expect(page.locator('a[href="#practice-ja-short-01"]')).toBeVisible();
  await expect(page.locator('a[href="#practice-ja-long-01"]')).toBeVisible();
  await expect(page.locator('a[href="#practice-ja-kata-a"]')).toHaveCount(0);

  // 키보드로 탭 이동
  await tabs.getByRole("tab", { name: "문장", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "단락" })).toHaveAttribute("aria-selected", "true");

  await page.reload();
  await expect(tabs.getByRole("tab", { name: "단락" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('a[href="#practice-ja-para-01"]')).toBeVisible();
});

test("좁은 화면: 글자·단어는 원본/연습/원본/연습, 문장은 원본/연습", async ({ page }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.goto("/#practice-ja-word-01");
  const compact = repeatsFor(page) === 2;
  await expect(page.locator(PRACTICE_LINE)).toHaveCount(compact ? 2 : 1);
  const kinds = await page.locator(".stage > .writing-line").evaluateAll((els) => els.map((e) => (e.classList.contains("model-line") ? "원본" : "연습")));
  expect(kinds).toEqual(compact ? ["원본", "연습", "원본", "연습"] : ["연습"]);

  // 두 번째 연습 칸에도 쓸 수 있고, 따로 기록된다
  if (compact) {
    await drawStroke(page, 1);
    await expect.poll(() => inkPixels(page, 1)).toBeGreaterThan(30);
    expect(await inkPixels(page, 0)).toBe(0);
  }
  // 3단계(혼자 쓰기)는 원본을 숨긴다
  await page.locator('.step-tab[data-step="free"]').click();
  await expect(page.locator(".stage .model-line")).toHaveCount(0);

  await page.goto("/#practice-ja-short-01");
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
  await expect(so.locator(".so-credit")).toContainText("KanjiVG");
  await expect(so.locator(".so-credit a")).toHaveAttribute("href", "https://kanjivg.tagaini.net");
  // 애니메이션이 끝나면 3획 모두와 번호·시작점·화살표
  await expect(so.locator(".so-count")).toHaveText("3 / 3", { timeout: 8000 });
  await expect(so.locator(".so-num")).toHaveText(["1", "2", "3"]);
  await expect(so.locator(".so-start")).toHaveCount(3);
  await expect(so.locator(".so-arrow")).toHaveCount(3);
  // 한 획씩 보기
  await so.getByRole("button", { name: "다음 획" }).click();
  await expect(so.locator(".so-count")).toHaveText("1 / 3");
  await expect(so.locator(".so-ink.current")).toHaveAttribute("data-stroke", "1");
  await so.getByRole("button", { name: "다음 획" }).click();
  await expect(so.locator(".so-count")).toHaveText("2 / 3");

  // 3단계는 기본으로 숨기고, 버튼으로 켤 수 있다
  await page.locator('.step-tab[data-step="free"]').click();
  await expect(page.locator(".stroke-order")).toHaveCount(0);
  await page.getByRole("button", { name: "획순" }).click();
  await expect(page.locator(".stroke-order")).toBeVisible();

  // 한자도
  await page.goto("/#practice-ja-kanji-09");
  await expect(page.locator(".stroke-order .so-ink")).toHaveCount(4);
});

test("획순 데이터가 없는 언어·단어에는 획순을 만들지 않는다", async ({ page }) => {
  await onboard(page, "ja", "ko", "韓国語");
  await page.goto("/#practice-ko-cons-01");
  await expect(page.locator(PRACTICE_LINE).first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator(".stroke-order")).toHaveCount(0);
  await expect(page.locator(".stroke-toggle")).toBeHidden();
});
