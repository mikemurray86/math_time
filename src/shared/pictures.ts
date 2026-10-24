// Picture-code keys: a child's code is a short sequence of indexes into this list.
export const PICTURES = ['🐶', '🐱', '🦄', '🍕', '🚀', '⭐', '🌈', '🍦', '⚽'];

export const CODE_MIN = 3;
export const CODE_MAX = 6;

export function isValidCode(code: unknown): code is number[] {
  return (
    Array.isArray(code) &&
    code.length >= CODE_MIN &&
    code.length <= CODE_MAX &&
    code.every((c) => Number.isInteger(c) && c >= 0 && c < PICTURES.length)
  );
}
