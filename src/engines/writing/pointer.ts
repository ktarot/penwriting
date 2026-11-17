/**
 * Pointer Events 기반 입력 처리 (터치·펜·마우스).
 * - 한 번에 하나의 포인터만 추적 (두 번째 손가락 무시)
 * - 펜 입력이 감지되면 이후 터치 입력은 손바닥 접촉으로 보고 무시 (palm rejection)
 * - 필기 영역에서 스크롤·확대·길게 누르기 메뉴를 막는다
 */
export interface PointerSample {
  clientX: number;
  clientY: number;
  time: number;
  pressure?: number;
}

export interface PointerHandlers {
  start(sample: PointerSample, rect: DOMRect, pointerType: string): void;
  move(samples: PointerSample[]): void;
  end(cancelled: boolean): void;
}

let penSeenGlobally = false;

export function resetPalmRejection(): void {
  penSeenGlobally = false;
}

export function attachPointerInput(el: HTMLElement, handlers: PointerHandlers): () => void {
  let activeId: number | null = null;
  let activeType = "";

  const sample = (e: PointerEvent): PointerSample => {
    const s: PointerSample = { clientX: e.clientX, clientY: e.clientY, time: e.timeStamp };
    if (e.pointerType === "pen" && e.pressure > 0) s.pressure = e.pressure;
    return s;
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "pen") penSeenGlobally = true;
    if (activeId !== null) return;
    if (e.pointerType === "touch" && penSeenGlobally) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    activeId = e.pointerId;
    activeType = e.pointerType;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* 일부 브라우저에서 캡처 실패는 무시 */
    }
    handlers.start(sample(e), el.getBoundingClientRect(), activeType);
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    handlers.move((events.length ? events : [e]).map(sample));
  };

  const finish = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    handlers.end(cancelled);
  };
  const onUp = (e: PointerEvent) => finish(e, false);
  const onCancel = (e: PointerEvent) => finish(e, true);

  // iOS Safari: touch-action만으로 부족한 경우를 대비해 터치 기본 동작도 막는다
  const blockTouch = (e: TouchEvent) => {
    if (e.cancelable) e.preventDefault();
  };
  const blockMenu = (e: Event) => e.preventDefault();

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onCancel);
  el.addEventListener("lostpointercapture", onUp);
  el.addEventListener("touchstart", blockTouch, { passive: false });
  el.addEventListener("touchmove", blockTouch, { passive: false });
  el.addEventListener("contextmenu", blockMenu);
  el.addEventListener("selectstart", blockMenu);

  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onCancel);
    el.removeEventListener("lostpointercapture", onUp);
    el.removeEventListener("touchstart", blockTouch);
    el.removeEventListener("touchmove", blockTouch);
    el.removeEventListener("contextmenu", blockMenu);
    el.removeEventListener("selectstart", blockMenu);
  };
}
