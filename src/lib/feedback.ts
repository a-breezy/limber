/**
 * Session feedback: beeps (Web Audio), vibration and keeping the screen awake.
 * Everything is feature-detected and fails silently; the player works without it.
 */

let ctx: AudioContext | undefined;

/** Must be called from a user gesture (e.g. the Start button) to unlock audio on iOS. */
export function unlockAudio() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = undefined;
  }
}

export type Beep = 'tick' | 'go' | 'done';

const TONES: Record<Beep, { freq: number; ms: number; gain: number }> = {
  tick: { freq: 880, ms: 90, gain: 0.15 }, // 3-2-1 countdown
  go: { freq: 1320, ms: 220, gain: 0.2 }, // a work step starts
  done: { freq: 660, ms: 380, gain: 0.2 }, // a work step ends
};

export function beep(kind: Beep) {
  if (!ctx || ctx.state !== 'running') return;
  try {
    const { freq, ms, gain } = TONES[kind];
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  } catch {
    /* audio is a nice-to-have */
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported (e.g. iOS Safari) */
  }
}

type Sentinel = { release: () => Promise<void> };

/** Keep the screen on until the returned cleanup function is called. */
export function keepAwake(): () => void {
  const wl = (
    navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<Sentinel> };
    }
  ).wakeLock;
  if (!wl) return () => {};
  let sentinel: Sentinel | undefined;
  let stopped = false;
  const acquire = async () => {
    try {
      if (!stopped && document.visibilityState === 'visible') sentinel = await wl.request('screen');
    } catch {
      /* denied or unsupported */
    }
  };
  // The lock drops when the tab is hidden; take it back when we return.
  const onVisible = () => void acquire();
  document.addEventListener('visibilitychange', onVisible);
  void acquire();
  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVisible);
    void sentinel?.release().catch(() => {});
  };
}
