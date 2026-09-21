import { clamp } from "../math";

/** Golden angle in radians — phyllotaxis, not a mystic constant. */
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function fibonacci(n: number): number {
  if (n <= 1) return 1;
  let a = 1;
  let b = 1;
  for (let i = 2; i <= n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

/** Developmental energy threshold for growth stage n. */
export function growthThreshold(stage: number, fibonacciWeight: number): number {
  return fibonacci(stage) * (10 + fibonacciWeight * 16);
}

export function goldenHeading(index: number, twist = 0): number {
  return index * GOLDEN_ANGLE + twist;
}

/** Logistic map: simple chaos, sensitive to initial conditions. */
export function logistic(x: number, r: number): number {
  const next = r * x * (1 - x);
  return clamp(next, 0.001, 0.999);
}

export function gridIndex(x: number, y: number, width: number, height: number, cell: number): number {
  const gx = clamp(Math.floor(x / cell), 0, width - 1);
  const gy = clamp(Math.floor(y / cell), 0, height - 1);
  return gy * width + gx;
}

export function laplacian(field: Float32Array, i: number, width: number, height: number): number {
  const x = i % width;
  const y = Math.floor(i / width);
  const left = field[y * width + ((x - 1 + width) % width)] ?? 0;
  const right = field[y * width + ((x + 1) % width)] ?? 0;
  const up = field[((y - 1 + height) % height) * width + x] ?? 0;
  const down = field[((y + 1) % height) * width + x] ?? 0;
  return left + right + up + down - 4 * (field[i] ?? 0);
}
