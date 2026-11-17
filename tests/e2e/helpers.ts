import { expect, type Page } from "@playwright/test";

/** 연습 칸 (좁은 화면의 원본 줄 제외) */
export const PRACTICE_LINE = ".stage .writing-line:not(.model-line)";
/** 연습 칸의 가이드 글자 */
export const PRACTICE_GUIDE = `${PRACTICE_LINE} .guide-solid`;

/** 좁은 화면(휴대폰)이면 글자·단어 연습 칸이 2개 */
export function repeatsFor(page: Page): number {
  return (page.viewportSize()?.width ?? 1000) < 600 ? 2 : 1;
}

/** 홈의 "내 문장" 탭을 연다 */
export async function openMine(page: Page) {
  await page.locator('[role=tab][data-tab="mine"]').click();
  await expect(page.locator("#custom-text")).toBeVisible();
}

const ENDONYM = { ko: "한국어", en: "English", ja: "日本語", vi: "Tiếng Việt" } as const;
type Lang = keyof typeof ENDONYM;

/** 최초 실행 설정을 마친다 */
export async function onboard(page: Page, native: Lang, learning: Lang, learningLabel: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/#welcome$/);
  await choose(page, 0, ENDONYM[native]);
  await choose(page, 1, learningLabel);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator(".item-list").first()).toBeVisible();
  void learning;
}

const exact = (t: string) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

/** 설정 폼에서 선택지를 고른다. 질문은 순서(번호) 또는 질문 문구로 지정한다 */
export async function choose(page: Page, fieldset: number | string, label: string) {
  const fs = typeof fieldset === "number" ? page.locator("fieldset").nth(fieldset) : page.locator("fieldset", { has: page.locator("legend", { hasText: exact(fieldset) }) });
  await fs.locator("label.choice", { hasText: exact(label) }).click();
}

/** 필기 줄 위에 한 획을 긋는다. 기기에 따라 마우스 또는 실제 터치 이벤트(CDP)를 사용한다. */
export async function drawStroke(page: Page, lineIndex = 0, from = [0.1, 0.3], to = [0.4, 0.8]) {
  const canvas = page.locator(".stage .writing-line .ink-live").nth(lineIndex);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const pts = Array.from({ length: 12 }, (_, i) => {
    const k = i / 11;
    return { x: box.x + box.width * (from[0] + (to[0] - from[0]) * k), y: box.y + box.height * (from[1] + (to[1] - from[1]) * k) };
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
export async function inkPixels(page: Page, lineIndex = 0, selector = PRACTICE_LINE): Promise<number> {
  return page.locator(selector).nth(lineIndex).locator("canvas.ink").first().evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
}
