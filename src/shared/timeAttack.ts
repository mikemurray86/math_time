/** Time Attack lengths a child can pick, in minutes. */
export const TIME_ATTACK_MINUTES = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];
export const TIME_ATTACK_DEFAULT = 30;

/** Answers that arrive this long after the clock hits zero still count (network lag). */
export const TIME_ATTACK_GRACE_MS = 3000;
