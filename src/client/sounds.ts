// Tiny synthesized sound effects (no audio files to ship or license).
import { load, save } from './storage.ts';

let ctx: AudioContext | null = null;
let muted = load('mt-muted', false);

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  save('mt-muted', m);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'triangle', gain = 0.18) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A pitch sweep, for whooshes and slide whistles. */
function slide(from: number, to: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function play(fn: () => void) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    fn();
  } catch {
    /* audio not available */
  }
}

export const sounds = {
  correct: () => play(() => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.3))),
  tryAgain: () => play(() => [392, 329.63].forEach((f, i) => tone(f, i * 0.15, 0.3, 'sine', 0.15))),
  reveal: () => play(() => tone(293.66, 0, 0.4, 'sine', 0.12)),
  tap: () => play(() => tone(880, 0, 0.06, 'sine', 0.06)),
  fanfare: () =>
    play(() => {
      [523.25, 523.25, 523.25, 698.46, 880, 1046.5].forEach((f, i) => tone(f, [0, 0.12, 0.24, 0.4, 0.6, 0.8][i], i === 5 ? 0.7 : 0.18));
    }),
  crazyWin: () =>
    play(() => {
      slide(200, 1600, 0, 0.35, 'triangle', 0.12);
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.3 + i * 0.07, 0.25, 'square', 0.07));
      [1046.5, 1318.5, 1568, 2093].forEach((f) => tone(f, 0.85, 0.6, 'triangle', 0.08));
    }),
  crazyOops: () =>
    play(() => {
      slide(900, 120, 0, 0.7, 'sine', 0.18);
      [0.75, 0.9, 1.05].forEach((t, i) => slide(260 - i * 40, 140 - i * 20, t, 0.14, 'triangle', 0.12));
    }),
  badge: () => play(() => [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(f, i * 0.07, 0.4, 'square', 0.06))),
};
