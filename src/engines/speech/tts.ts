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

/**
 * ok: 재생 시작됨 · unsupported: 브라우저에 음성 기능 없음
 * no-voice: 해당 언어 음성 없음 · blocked: 브라우저가 재생을 막음 · error: 기타 실패
 */
export type SpeakResult = "ok" | "unsupported" | "no-voice" | "blocked" | "error";

export interface SpeechDiagnostics {
  supported: boolean;
  voices: VoiceInfo[];
}

export interface SpeechEngine {
  /** 이 기기에서 해당 언어 음성을 쓸 수 있는지 */
  canSpeak(locale: string): Promise<boolean>;
  speak(text: string, locale: string, rate?: number): Promise<SpeakResult>;
  stop(): void;
  /** 음성 목록을 미리 불러 둔다 (버튼을 눌렀을 때 바로 재생하기 위해) */
  warmUp(): void;
  diagnose(): Promise<SpeechDiagnostics>;
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

/** 재생이 시작되지 않을 때 포기하기까지의 시간 */
const START_TIMEOUT_MS = 4000;

class WebSpeechEngine implements SpeechEngine {
  private voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;
  /** Chrome은 재생 중인 utterance가 가비지 컬렉션되면 이벤트가 사라진다 — 참조를 붙잡아 둔다 */
  current: SpeechSynthesisUtterance | null = null;

  private get synth(): SpeechSynthesis | undefined {
    return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined;
  }

  /**
   * 음성 목록은 비동기로 채워지는 브라우저가 많다.
   * Android Chrome은 voiceschanged를 보내지 않기도 해서 짧게 여러 번 다시 확인한다.
   */
  private voices(waitMs = 1500): Promise<SpeechSynthesisVoice[]> {
    const synth = this.synth;
    if (!synth) return Promise.resolve([]);
    const now = synth.getVoices();
    if (now.length) return Promise.resolve(now);
    if (!this.voicesReady) {
      this.voicesReady = new Promise((resolve) => {
        const started = Date.now();
        const finish = () => {
          clearInterval(timer);
          resolve(synth.getVoices());
        };
        const timer = setInterval(() => {
          if (synth.getVoices().length || Date.now() - started >= waitMs) finish();
        }, 150);
        synth.addEventListener?.("voiceschanged", finish, { once: true });
      });
      this.voicesReady.then((v) => {
        if (!v.length) this.voicesReady = null;
      });
    }
    return this.voicesReady;
  }

  warmUp(): void {
    void this.voices(3000);
  }

  async diagnose(): Promise<SpeechDiagnostics> {
    const supported = Boolean(this.synth) && typeof SpeechSynthesisUtterance !== "undefined";
    const voices = supported ? await this.voices(3000) : [];
    return { supported, voices: voices.map((v) => ({ lang: v.lang, name: v.name, localService: v.localService, default: v.default })) };
  }

  async canSpeak(locale: string): Promise<boolean> {
    if (!this.synth || typeof SpeechSynthesisUtterance === "undefined") return false;
    return Boolean(pickVoice(await this.voices(), locale));
  }

  async speak(text: string, locale: string, rate = 1): Promise<SpeakResult> {
    const synth = this.synth;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return "unsupported";
    // 목록이 이미 있으면 기다리지 않는다 (사용자 탭 직후에 재생해야 막히지 않는다)
    const list = synth.getVoices().length ? synth.getVoices() : await this.voices(1000);
    const voice = pickVoice(list, locale);
    try {
      // 재생 중일 때만 정지 — 정지 직후 바로 재생하면 일부 기기에서 새 재생까지 취소된다
      if (synth.speaking || synth.pending) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // 맞는 음성을 못 찾아도 언어만 지정해 재생을 시도한다 (Android는 목록이 비어도 재생되는 경우가 있다)
      u.lang = voice?.lang.replace("_", "-") ?? locale;
      u.rate = rate;
      if (voice) {
        try {
          u.voice = voice;
        } catch {
          /* 일부 환경은 voice 지정을 거부한다 — lang만으로 재생 */
        }
      }
      this.current = u;
      return await new Promise<SpeakResult>((resolve) => {
        let settled = false;
        const done = (r: SpeakResult) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(r);
        };
        // 끝 이벤트가 오지 않는 브라우저가 있어 "시작"을 성공으로 본다
        u.onstart = () => done("ok");
        u.onend = () => done("ok");
        u.onerror = (e) => {
          const code = e.error;
          if (code === "interrupted" || code === "canceled") done("ok");
          else if (code === "language-unavailable" || code === "voice-unavailable") done("no-voice");
          else if (code === "not-allowed") done("blocked");
          else done(voice ? "error" : "no-voice");
        };
        const timer = setTimeout(() => {
          synth.cancel();
          done(voice ? "error" : "no-voice");
        }, START_TIMEOUT_MS);
        synth.speak(u);
      });
    } catch {
      return "error";
    }
  }

  stop(): void {
    const synth = this.synth;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
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
