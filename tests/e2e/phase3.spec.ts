import { expect, test, type Page } from "@playwright/test";
import { choose, drawStroke, inkPixels, onboard } from "./helpers";

async function finishThreeSteps(page: Page) {
  for (let i = 0; i < 3; i++) {
    await drawStroke(page, 0, [0.1 + i * 0.2, 0.3], [0.25 + i * 0.2, 0.8]);
    await page.locator("button.next").click();
  }
  await expect(page).toHaveURL(/#compare$/);
}

test.describe("기록·진도", () => {
  test.beforeEach(async ({ page }) => onboard(page, "ko", "ko", "한국어"));

  test("결과를 저장하고, 기록에서 다시 보고, 삭제할 수 있다", async ({ page }) => {
    await page.goto("/#practice-ko-word-01");
    await finishThreeSteps(page);
    await page.getByRole("button", { name: /기록 저장/ }).click();
    await expect(page.locator(".status")).toContainText("저장했습니다");
    await expect(page.getByRole("button", { name: /기록 저장/ })).toBeDisabled();

    await page.goto("/#history");
    await expect(page.locator(".record")).toHaveCount(1);
    await expect(page.locator(".record .r-text")).toHaveText("사람");
    await page.getByRole("link", { name: "보기" }).click();
    await expect(page).toHaveURL(/#record-/);
    // 저장된 필기가 복원된다
    for (const step of ["trace", "hint", "free"]) {
      await expect.poll(() => inkPixels(page, 0, `.compare-row.step-${step} .writing-line`)).toBeGreaterThan(30);
    }
    await page.getByRole("button", { name: /삭제/ }).click();
    await page.locator("dialog.confirm").getByRole("button", { name: "삭제" }).click();
    await expect(page).toHaveURL(/#history$/);
    await expect(page.locator(".empty-state")).toBeVisible();
  });

  test("새로고침 후에도 기록이 남고, 전체 삭제할 수 있다", async ({ page }) => {
    for (const id of ["ko-syl-01", "ko-syl-02"]) {
      await page.goto(`/#practice-${id}`);
      await finishThreeSteps(page);
      await page.getByRole("button", { name: /기록 저장/ }).click();
      await expect(page.locator(".status")).toContainText("저장했습니다");
    }
    await page.goto("/#history");
    await page.reload();
    await expect(page.locator(".record")).toHaveCount(2);
    await page.getByRole("button", { name: /전체 기록 삭제/ }).click();
    await page.locator("dialog.confirm").getByRole("button", { name: /전체 기록 삭제/ }).click();
    await expect(page.locator(".record")).toHaveCount(0);
  });

  test("연습 횟수가 쌓이고, 다음 학습을 권한다", async ({ page }) => {
    for (let n = 0; n < 2; n++) {
      await page.goto("/#practice-ko-cons-01");
      await finishThreeSteps(page);
    }
    await page.goto("/");
    const link = page.locator('a.item-link[href="#practice-ko-cons-01"]');
    await expect(link.locator(".count")).toHaveText("2회");
    await expect(page.locator(".continue .c-src")).toHaveText("ㄴ");
  });

  test("쓰던 필기를 자동 저장하고 이어서 쓸 수 있다", async ({ page }) => {
    await page.goto("/#practice-ko-short-02");
    await drawStroke(page);
    await page.locator("button.next").click();
    await drawStroke(page, 0, [0.5, 0.3], [0.7, 0.8]);
    await page.waitForTimeout(600); // 자동 저장 대기
    await page.goto("/");
    await expect(page.locator(".continue h2")).toHaveText("쓰던 필기가 남아 있습니다");
    await page.locator(".continue a").click();
    await expect(page.locator(".notice")).toContainText("불러왔습니다");
    await expect(page.locator(".step-tab.current")).toHaveAttribute("data-step", "hint");
    await expect.poll(() => inkPixels(page)).toBeGreaterThan(30);
    await page.locator('.step-tab[data-step="trace"]').click();
    await expect.poll(() => inkPixels(page)).toBeGreaterThan(30);
    // 처음부터
    await page.getByRole("button", { name: /처음부터/ }).click();
    await expect(page.locator(".step-tab.current")).toHaveAttribute("data-step", "trace");
    await expect.poll(() => inkPixels(page)).toBe(0);
  });
});

test("내 문장을 저장·수정·연습·삭제할 수 있다", async ({ page }) => {
  await onboard(page, "ko", "en", "영어");
  await page.locator("#custom-text").fill("The quick brown fox");
  await page.getByRole("button", { name: /내 문장에 저장/ }).click();
  const row = page.locator(".custom-list li");
  await expect(row).toHaveCount(1);
  await expect(row.locator(".c-text")).toHaveText("The quick brown fox");
  await row.getByRole("button", { name: "수정" }).click();
  await page.locator("#custom-text").fill("The quick brown fox jumps");
  await page.getByRole("button", { name: /^✓ 저장$/ }).click();
  await expect(row.locator(".c-text")).toHaveText("The quick brown fox jumps");
  await page.reload();
  await expect(page.locator(".custom-list .c-text")).toHaveText("The quick brown fox jumps");
  await page.locator(".custom-list").getByRole("link", { name: "연습" }).click();
  await expect(page).toHaveURL(/#practice-custom-/);
  await expect(page.locator(".guide-solid").first()).toHaveAttribute("lang", "en");
  await page.goto("/");
  await page.locator(".custom-list").getByRole("button", { name: /삭제/ }).click();
  await page.locator("dialog.confirm").getByRole("button", { name: "삭제" }).click();
  await expect(page.locator(".custom-list li")).toHaveCount(0);
});

test("접근성 설정: 화면 글자 크기, 테마, 고대비, 칠판, 왼손잡이", async ({ page }) => {
  await onboard(page, "ko", "ko", "한국어");
  await page.goto("/#options");
  await choose(page, "화면 글자 크기", "150%");
  await choose(page, "테마", "어둡게");
  await page.getByRole("switch", { name: "고대비" }).check();
  await choose(page, "종이 색", "칠판");
  await choose(page, "도구 위치", "왼손잡이");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).not.toHaveURL(/#options$/);

  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveAttribute("data-contrast", "high");
  await expect(html).toHaveAttribute("data-hand", "left");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("24px");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(0, 0, 0)");

  await page.reload();
  await page.goto("/#practice-ko-word-01");
  const line = page.locator(".writing-line").first();
  await expect(line).toBeVisible();
  expect(await line.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
  // 칠판을 고르면 펜이 흰색으로
  await expect(page.locator('.swatch[data-value="#ffffff"]')).toHaveAttribute("aria-checked", "true");
  expect(await page.locator(".practice-footer").evaluate((el) => getComputedStyle(el).flexDirection)).toBe("row-reverse");
  // 넓은 화면에서는 도구 막대가 필기 영역의 오른쪽(왼손잡이)
  if ((page.viewportSize()?.width ?? 0) >= 900) {
    const tb = (await page.locator(".workspace .toolbar").boundingBox())!;
    const st = (await page.locator(".stage").boundingBox())!;
    expect(tb.x).toBeGreaterThan(st.x);
  }
});

test.describe("음성", () => {
  test("항목의 재생용 텍스트(문자 이름)를 학습 언어 음성으로 읽는다", async ({ page }) => {
    await page.addInitScript(() => {
      const spoken: { text: string; lang: string }[] = [];
      (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
      const voices = [{ lang: "ko-KR", name: "Korean", localService: true, default: false, voiceURI: "ko" }];
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => voices,
          addEventListener: () => {},
          cancel: () => {},
          speak: (u: SpeechSynthesisUtterance) => {
            spoken.push({ text: u.text, lang: u.lang });
            setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 10);
          },
        },
      });
    });
    await onboard(page, "en", "ko", "Korean");
    await page.goto("/#practice-ko-cons-01");
    await page.getByRole("button", { name: /Listen/ }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken)).toEqual([{ text: "기역", lang: "ko-KR" }]);
    await expect(page.locator(".tts-msg")).toBeHidden();
  });

  test("음성이 없는 기기에서는 안내를 보여 준다", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        value: { getVoices: () => [], addEventListener: () => {}, cancel: () => {}, speak: () => {} },
      });
    });
    await onboard(page, "ko", "vi", "베트남어");
    await page.goto("/#practice-vi-word-01");
    await page.getByRole("button", { name: /듣기/ }).click();
    await expect(page.locator(".tts-msg")).toContainText("베트남어 음성이 없습니다");
  });
});

test("오프라인: 한 번 연 학습 내용은 인터넷 없이도 열린다", async ({ page, context }) => {
  await onboard(page, "ko", "ja", "일본어");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload(); // 서비스 워커가 페이지를 제어하도록
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto("/#practice-ja-hira-a");
  await expect(page.locator(".guide-solid")).toHaveText("あ");
  await page.waitForTimeout(500);

  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "히라가나" })).toBeVisible();
  await page.goto("/#practice-ja-hira-ka");
  await expect(page.locator(".guide-solid")).toHaveText("か");
  await drawStroke(page);
  await expect.poll(() => inkPixels(page)).toBeGreaterThan(30);
  expect(await page.evaluate(() => document.fonts.check('400 100px "Noto Sans JP"', "か"))).toBe(true);
  await context.setOffline(false);
});
