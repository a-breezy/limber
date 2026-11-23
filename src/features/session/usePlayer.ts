import { useEffect, useReducer, useRef } from 'react';
import type { RoutineItem } from '../../engine/routine';
import { beep, keepAwake, vibrate } from '../../lib/feedback';
import { currentStep, initPlayer, playerReducer, secondsLeft } from '../../player/player';

const TICK_MS = 250;

/** Runs the player clock and fires beeps/vibration at the right moments. */
export function usePlayer(items: readonly RoutineItem[], muted: boolean) {
  const [state, dispatch] = useReducer(playerReducer, items, initPlayer);
  const playing = state.status === 'playing';

  // Clock: real elapsed time, so throttled background timers don't slow the session.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', dt: (now - last) / 1000 });
      last = now;
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  // Keep the screen on for the whole session (not just while playing).
  useEffect(() => {
    if (state.status === 'ready' || state.status === 'done') return;
    return keepAwake();
  }, [state.status]);

  // Cues: 3-2-1 ticks before a step ends, "go" when work starts, "done" when it ends.
  const prev = useRef({ index: state.index, left: secondsLeft(state) });
  useEffect(() => {
    const step = currentStep(state);
    const left = secondsLeft(state);
    const p = prev.current;
    prev.current = { index: state.index, left };
    if (muted || state.status !== 'playing') return;

    if (state.index !== p.index) {
      const prevStep = state.script[p.index];
      if (prevStep?.kind === 'work') {
        beep('done');
        vibrate(120);
      }
      if (step?.kind === 'work') {
        beep('go');
        vibrate([60, 40, 60]);
      }
      return;
    }
    // Whole-second boundary crossed in the last 3 seconds (reps are paced, so skip them).
    if (step && !(step.kind === 'work' && step.mode === 'reps')) {
      for (const mark of [3, 2, 1]) {
        if (p.left > mark && left <= mark) beep('tick');
      }
    }
  }, [state, muted]);

  return [state, dispatch] as const;
}
