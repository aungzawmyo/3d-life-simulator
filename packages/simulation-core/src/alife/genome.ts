import { clamp } from "../math";
import type { Rng } from "../rng";
import type { Genome } from "./types";

const BOUNDS: { [K in keyof Genome]: [number, number] } = {
  fibonacciWeight: [0.2, 1.2],
  branchAngle: [18, 158],
  growthRatio: [0.48, 0.92],
  radiusRatio: [0.52, 0.94],
  metabolism: [0.18, 1.15],
  absorbRate: [0.25, 2.4],
  movementCost: [0.04, 0.55],
  repairRate: [0.05, 0.75],
  reproductionThreshold: [48, 210],
  mutationRate: [0.001, 0.07],
  diffusionA: [0.12, 1.15],
  diffusionB: [0.05, 0.72],
  feedA: [0.012, 0.078],
  killB: [0.042, 0.118],
  caSenseRadius: [10, 46],
  chaosR: [2.85, 3.92],
};

export function clampGenome(genome: Genome): Genome {
  const next = { ...genome };
  for (const key of Object.keys(BOUNDS) as (keyof Genome)[]) {
    const [min, max] = BOUNDS[key];
    next[key] = clamp(next[key], min, max);
  }
  return next;
}

export function seedGenome(rng: Rng): Genome {
  return clampGenome({
    fibonacciWeight: rng.float(0.35, 0.95),
    branchAngle: rng.chance(0.45) ? rng.float(28, 42) : rng.float(120, 145),
    growthRatio: rng.float(0.58, 0.82),
    radiusRatio: rng.float(0.62, 0.88),
    metabolism: rng.float(0.35, 0.85),
    absorbRate: rng.float(0.55, 1.6),
    movementCost: rng.float(0.08, 0.28),
    repairRate: rng.float(0.12, 0.45),
    reproductionThreshold: rng.float(70, 150),
    mutationRate: rng.float(0.003, 0.02),
    diffusionA: rng.float(0.3, 0.9),
    diffusionB: rng.float(0.12, 0.45),
    feedA: rng.float(0.02, 0.055),
    killB: rng.float(0.055, 0.09),
    caSenseRadius: rng.float(14, 32),
    chaosR: rng.float(3.2, 3.8),
  });
}

function jitter(value: number, key: keyof Genome, rng: Rng, scale: number): number {
  const [min, max] = BOUNDS[key];
  const span = max - min;
  const sigma = rng.chance(0.04) ? span * 0.12 : span * 0.028;
  return value + rng.normal(0, sigma * scale);
}

export function mutate(genome: Genome, rng: Rng): Genome {
  const scale = 0.4 + genome.mutationRate * 18;
  const next = { ...genome };
  for (const key of Object.keys(BOUNDS) as (keyof Genome)[]) {
    if (rng.chance(0.35 + genome.mutationRate * 8)) {
      next[key] = jitter(next[key], key, rng, scale);
    }
  }
  return clampGenome(next);
}

export function crossover(a: Genome, b: Genome, rng: Rng): Genome {
  const child = { ...a };
  for (const key of Object.keys(BOUNDS) as (keyof Genome)[]) {
    child[key] = rng.chance(0.5) ? a[key] : b[key];
    if (rng.chance(0.25)) {
      child[key] = (a[key] + b[key]) / 2;
    }
  }
  return mutate(child, rng);
}
