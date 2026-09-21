export type LifeState = "seed" | "growing" | "active" | "dormant" | "reproducing" | "dead";

/** Genome is a program, not a description (color/legs). */
export interface Genome {
  fibonacciWeight: number;
  branchAngle: number;
  growthRatio: number;
  radiusRatio: number;
  metabolism: number;
  absorbRate: number;
  movementCost: number;
  repairRate: number;
  reproductionThreshold: number;
  mutationRate: number;
  diffusionA: number;
  diffusionB: number;
  feedA: number;
  killB: number;
  caSenseRadius: number;
  chaosR: number;
}

export interface LifeNode {
  id: string;
  age: number;
  energy: number;
  matter: number;
  health: number;
  genome: Genome;
  x: number;
  y: number;
  z: number;
  heading: number;
  length: number;
  radius: number;
  parentId?: string;
  children: string[];
  connections: string[];
  state: LifeState;
  morphogenA: number;
  morphogenB: number;
  generation: number;
  depth: number;
  kind: "soma" | "seed";
  chaos: number;
}

export interface ALifeWorld {
  seed: number;
  width: number;
  height: number;
  cell: number;
  nutrients: Float32Array;
  signalA: Float32Array;
  signalB: Float32Array;
  nodes: Record<string, LifeNode>;
  tick: number;
  rngState: number;
  nextId: number;
  births: number;
  deaths: number;
  generations: number;
}

export interface ALifeSummary {
  tick: number;
  living: number;
  seeds: number;
  meanEnergy: number;
  meanHealth: number;
  meanBranchAngle: number;
  meanEfficiency: number;
  births: number;
  deaths: number;
  generations: number;
}

export interface ALifeOptions {
  seed?: number;
  width?: number;
  height?: number;
  starters?: number;
}
