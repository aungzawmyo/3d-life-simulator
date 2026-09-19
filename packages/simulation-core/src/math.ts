export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function ema(previous: number, next: number, alpha = 0.12): number {
  return previous * (1 - alpha) + next * alpha;
}

/** Maps 0–100 into 0–1 with diminishing returns. */
export function satiate(value: number, half = 45): number {
  const v = Math.max(0, value);
  return v / (v + half);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
