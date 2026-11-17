/**
 * 음성 출력 엔진. 브라우저 내장 TTS(Web Speech API)를 쓰며,
 * 나중에 녹음 음성·외부 엔진으로 바꿀 수 있도록 인터페이스로 분리한다.
 */
export interface VoiceInfo {
  lang: string;
  name: string;
  localService?: boolean;
  default?: boolean;
}

export type SpeakResult = "ok" | "unsupported" | "no-voice" | "error";

export interface SpeechEngine {
  /** 이 기기에서 해당 언어 음성을 쓸 수 있는지 */
  canSpeak(locale: string): Promise<boolean>;
  speak(text: string, locale: string, rate?: number): Promise<SpeakResult>;
  stop(): void;
}

/**
 * 언어 태그에 맞는 음성을 고른다.
 * 정확한 지역(ko-KR) > 같은 언어(ko-*) 순, 같은 조건이면 기기 내장·기본 음성 우선.
 */
export function pickVoice<V extends VoiceInfo>(voices: readonly V[], locale: string): V | undefined {
  const want = locale.toLowerCase().replace("_", "-");
  const base = want.split("-")[0];
  const norm = (v: V) => v.lang.toLowerCase().replace("_", "-");
  const score = (v: V) => {
    const l = norm(v);
    let sc = l === want ? 100 : l.split("-")[0] === base ? 50 : 0;
    if (!sc) return 0;
    if (v.localService) sc += 2;
    if (v.default) sc += 1;
    return sc;
  };
  let best: V | undefined;
  let bestScore = 0;
  for (const v of voices) {
    const sc = score(v);
    if (sc > bestScore) {
      best = v;
      bestScore = sc;
    }
  }
  return best;
}

class WebSpeechEngine implements SpeechEngine {
  private voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

  private get synth(): SpeechSynthesis | undefined {
    return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined;
  }

  /** 음성 목록은 비동기로 채워지는 브라우저가 많다 (Chrome 등) */
  private voices(): Promise<SpeechSynthesisVoice[]> {
    const synth = this.synth;
    if (!synth) return Promise.resolve([]);
    const now = synth.getVoices();
    if (now.length) return Promise.resolve(now);
    if (!this.voicesReady) {
      this.voicesReady = new Promise((resolve) => {
        const done = () => resolve(synth.getVoices());
        synth.addEventListener?.("voiceschanged", done, { once: true });
        setTimeout(done, 1500);
      });
      this.voicesReady.then((v) => {
        if (!v.length) this.voicesReady = null;
      });
    }
    return this.voicesReady;
  }

  async canSpeak(locale: string): Promise<boolean> {
    if (!this.synth || typeof SpeechSynthesisUtterance === "undefined") return false;
    return Boolean(pickVoice(await this.voices(), locale));
  }

  async speak(text: string, locale: string, rate = 1): Promise<SpeakResult> {
    const synth = this.synth;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return "unsupported";
    const voice = pickVoice(await this.voices(), locale);
    if (!voice) return "no-voice";
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voice.lang;
      u.rate = rate;
      try {
        u.voice = voice;
      } catch {
        /* 일부 환경은 voice 지정을 거부한다 — lang만으로 재생 */
      }
      return await new Promise<SpeakResult>((resolve) => {
        u.onend = () => resolve("ok");
        u.onerror = (e) => resolve(e.error === "interrupted" || e.error === "canceled" ? "ok" : "error");
        synth.speak(u);
      });
    } catch {
      return "error";
    }
  }

  stop(): void {
    this.synth?.cancel();
  }
}

let engine: SpeechEngine = new WebSpeechEngine();

export function speech(): SpeechEngine {
  return engine;
}

/** 테스트·다른 엔진 교체용 */
export function setSpeechEngine(e: SpeechEngine): void {
  engine = e;
}
