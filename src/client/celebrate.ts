import confetti from 'canvas-confetti';

const colors = ['#6c4cf1', '#ff7a59', '#ffc93c', '#2ec4b6', '#ff5d8f'];
const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function burst() {
  if (calm()) return;
  void confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
}

export function bigCelebration() {
  if (calm()) return;
  const end = Date.now() + 1500;
  const frame = () => {
    void confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors });
    void confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

/** Crazy Mode: confetti cannons from every corner. */
export function crazyConfetti() {
  if (calm()) return;
  const fire = (x: number, y: number, angle: number) =>
    void confetti({ particleCount: 70, angle, spread: 80, startVelocity: 60, scalar: 1.6, origin: { x, y }, colors, shapes: ['star', 'circle', 'square'] });
  fire(0, 1, 60);
  fire(1, 1, 120);
  setTimeout(() => {
    fire(0, 0.3, 30);
    fire(1, 0.3, 150);
    void confetti({ particleCount: 150, spread: 360, startVelocity: 45, scalar: 2, origin: { x: 0.5, y: 0.4 }, colors, shapes: ['star'] });
  }, 350);
}

/** Flood Mode: bubbles that float up instead of falling. */
export function bubbles() {
  if (calm()) return;
  void confetti({
    particleCount: 60, spread: 80, startVelocity: 30, gravity: -0.35, ticks: 260, scalar: 1.4,
    origin: { y: 0.95 }, colors: ['#bde0fe', '#a2d2ff', '#90e0ef', '#ffffff'], shapes: ['circle'],
  });
}

/** Retro Mode: flat square "pixels" in an old game console palette. */
export function retroConfetti() {
  if (calm()) return;
  void confetti({
    particleCount: 80, spread: 100, startVelocity: 40, scalar: 1.3, flat: true,
    origin: { y: 0.6 }, colors: ['#e52521', '#fbd000', '#43b047', '#049cd8', '#ffffff'], shapes: ['square'],
  });
}

export const reducedMotion = calm;
