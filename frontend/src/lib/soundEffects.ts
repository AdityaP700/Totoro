/**
 * Minimal, subtle UI tones synthesized via the browser Web Audio API.
 * Adheres to sound guidelines: zero external downloads, pure oscillator envelopes,
 * quiet volume, and fails silently without interrupting the chat experience.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem("totoro_sound_enabled");
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("totoro_sound_enabled", String(enabled));
  } catch {}
}

/**
 * Sound 1 — Message submitted: short, soft UI tap (~40-80ms)
 */
export function playSubmitSound(): void {
  try {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    // Fail silently per instruction
  }
}

/**
 * Sound 2 — Meaningful finding received: soft notification chime (~150-220ms)
 */
export function playFindingSound(): void {
  try {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Warm chime: 587.33 Hz (D5) -> 880 Hz (A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.07);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.21);
  } catch {
    // Fail silently per instruction
  }
}

/**
 * Sound 3 — Resolution verified: warm two-note confirmation (~250-320ms)
 */
export function playVerifiedSound(): void {
  try {
    if (!isSoundEnabled()) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Note 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(659.25, now + 0.11);
    gain2.gain.setValueAtTime(0.08, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.31);
  } catch {
    // Fail silently per instruction
  }
}
