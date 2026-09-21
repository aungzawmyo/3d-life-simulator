import { clamp } from "../math";
import { Rng } from "../rng";
import { crossover, mutate, seedGenome } from "./genome";
import { goldenHeading, gridIndex, growthThreshold, laplacian, logistic } from "./mathlife";
import type { ALifeOptions, ALifeSummary, ALifeWorld, Genome, LifeNode, LifeState } from "./types";

const MAX_NODES = 480;
const MAX_DEPTH = 7;
const MAX_BRANCHES = 5;
const WORLD_SCALE = 8;

function livingOf(world: ALifeWorld): LifeNode[] {
  return Object.values(world.nodes).filter((node) => node.state !== "dead");
}

function nextId(world: ALifeWorld): string {
  world.nextId += 1;
  return `n${world.nextId}`;
}

function createNode(
  world: ALifeWorld,
  rng: Rng,
  partial: Omit<LifeNode, "id" | "children" | "connections" | "state"> & {
    state?: LifeState;
    children?: string[];
    connections?: string[];
  },
): LifeNode {
  return {
    id: nextId(world),
    children: [],
    connections: [],
    state: "seed",
    ...partial,
    energy: Math.max(0, partial.energy),
    health: clamp(partial.health, 0, 100),
    chaos: clamp(partial.chaos || rng.float(0.12, 0.55), 0.001, 0.999),
  };
}

function seedWorld(options: ALifeOptions): ALifeWorld {
  const width = options.width ?? 48;
  const height = options.height ?? 48;
  const cells = width * height;
  const nutrients = new Float32Array(cells);
  const signalA = new Float32Array(cells);
  const signalB = new Float32Array(cells);
  const rng = new Rng(options.seed ?? 2026);

  for (let i = 0; i < cells; i += 1) {
    nutrients[i] = rng.float(0.08, 0.35);
    signalA[i] = rng.float(0.2, 0.55);
    signalB[i] = rng.float(0.05, 0.22);
  }

  const sources = 7;
  for (let s = 0; s < sources; s += 1) {
    const cx = rng.int(4, width - 5);
    const cy = rng.int(4, height - 5);
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const i = (cy + dy) * width + (cx + dx);
        nutrients[i] = Math.min(1, (nutrients[i] ?? 0) + rng.float(0.35, 0.7));
      }
    }
  }

  return {
    seed: options.seed ?? 2026,
    width,
    height,
    cell: WORLD_SCALE,
    nutrients,
    signalA,
    signalB,
    nodes: {},
    tick: 0,
    rngState: rng.getState(),
    nextId: 0,
    births: 0,
    deaths: 0,
    generations: 0,
  };
}

function plantStarters(world: ALifeWorld, rng: Rng, count: number): void {
  const spanX = world.width * world.cell;
  const spanY = world.height * world.cell;
  for (let i = 0; i < count; i += 1) {
    const genome = seedGenome(rng);
    const node = createNode(world, rng, {
      age: 0,
      energy: rng.float(55, 95),
      matter: rng.float(8, 18),
      health: rng.float(70, 95),
      genome,
      x: rng.float(spanX * 0.12, spanX * 0.88),
      y: rng.float(spanY * 0.12, spanY * 0.88),
      z: 0,
      heading: rng.float(0, Math.PI * 2),
      length: rng.float(10, 16),
      radius: rng.float(3.2, 5.2),
      generation: 0,
      depth: 0,
      kind: "seed",
      chaos: rng.float(0.2, 0.5),
      morphogenA: 0.4,
      morphogenB: 0.2,
    });
    world.nodes[node.id] = node;
    world.births += 1;
  }
}

function updateEnvironment(world: ALifeWorld, rng: Rng): void {
  const { width, height, nutrients } = world;
  for (let i = 0; i < nutrients.length; i += 1) {
    if (rng.chance(0.012)) {
      nutrients[i] = Math.min(1, (nutrients[i] ?? 0) + rng.float(0.04, 0.14));
    }
    nutrients[i] = clamp((nutrients[i] ?? 0) * 0.998, 0, 1);
  }
  const pulses = 3;
  for (let p = 0; p < pulses; p += 1) {
    const i = rng.int(0, width * height - 1);
    nutrients[i] = Math.min(1, (nutrients[i] ?? 0) + 0.18);
  }
}

function diffuseField(field: Float32Array, width: number, height: number, rate: number): void {
  const next = new Float32Array(field.length);
  for (let i = 0; i < field.length; i += 1) {
    next[i] = clamp((field[i] ?? 0) + rate * laplacian(field, i, width, height), 0, 1.4);
  }
  field.set(next);
}

function diffuseResources(world: ALifeWorld): void {
  diffuseField(world.nutrients, world.width, world.height, 0.12);
}

function diffuseChemicalSignals(world: ALifeWorld): void {
  const { width, height, signalA, signalB } = world;
  const nextA = new Float32Array(signalA.length);
  const nextB = new Float32Array(signalB.length);
  let feed = 0.036;
  let kill = 0.062;
  const living = livingOf(world);
  if (living.length > 0) {
    feed = living.reduce((sum, n) => sum + n.genome.feedA, 0) / living.length;
    kill = living.reduce((sum, n) => sum + n.genome.killB, 0) / living.length;
  }
  const da = 0.16;
  const db = 0.08;
  for (let i = 0; i < signalA.length; i += 1) {
    const a = signalA[i] ?? 0;
    const b = signalB[i] ?? 0;
    const react = a * b * b;
    nextA[i] = clamp(a + da * laplacian(signalA, i, width, height) - react + feed * (1 - a), 0, 1.2);
    nextB[i] = clamp(b + db * laplacian(signalB, i, width, height) + react - (kill + feed) * b, 0, 1.2);
  }
  signalA.set(nextA);
  signalB.set(nextB);
}

function cellAt(world: ALifeWorld, x: number, y: number): number {
  return gridIndex(x, y, world.width, world.height, world.cell);
}

function neighborsOf(node: LifeNode, living: LifeNode[]): LifeNode[] {
  const r = node.genome.caSenseRadius;
  const r2 = r * r;
  const found: LifeNode[] = [];
  for (const other of living) {
    if (other.id === node.id || other.state === "dead") continue;
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    if (dx * dx + dy * dy <= r2) found.push(other);
  }
  return found;
}

function absorb(node: LifeNode, world: ALifeWorld): number {
  const i = cellAt(world, node.x, node.y);
  const available = world.nutrients[i] ?? 0;
  const take = Math.min(available, node.genome.absorbRate * (0.35 + available));
  world.nutrients[i] = Math.max(0, available - take);
  return take * 14;
}

function metabolize(node: LifeNode, world: ALifeWorld): void {
  node.chaos = logistic(node.chaos, node.genome.chaosR);
  const absorbed = absorb(node, world);
  const burn = node.genome.metabolism * (0.82 + 0.36 * node.chaos) * (node.kind === "soma" ? 0.7 : 1);
  node.energy = Math.max(0, node.energy + absorbed - burn);
  node.matter = Math.max(0, node.matter + absorbed * 0.08 - burn * 0.04);
}

function automata(node: LifeNode, neighbors: LifeNode[]): void {
  if (node.energy <= 0) {
    node.state = "dead";
    return;
  }
  if (node.energy < 7) {
    node.state = "dormant";
    return;
  }
  if (node.energy >= node.genome.reproductionThreshold && node.kind === "seed") {
    node.state = "reproducing";
    return;
  }
  if (node.health < 55 && node.energy > 12) {
    node.state = "active";
    return;
  }
  node.state = node.children.length < MAX_BRANCHES ? "growing" : "active";

  const signal = neighbors.find((n) => n.morphogenB > 0.55);
  if (signal) {
    const dx = signal.x - node.x;
    const dy = signal.y - node.y;
    node.heading += Math.atan2(dy, dx) * 0.08;
  }
  const richer = neighbors.find((n) => n.energy > node.energy + 18);
  if (richer && node.energy < 20) {
    const gift = Math.min(4, richer.energy * 0.02);
    richer.energy -= gift;
    node.energy += gift;
  }
}

function morphogenesis(node: LifeNode, world: ALifeWorld): void {
  const i = cellAt(world, node.x, node.y);
  const a = world.signalA[i] ?? 0;
  const b = world.signalB[i] ?? 0;
  node.morphogenA = a;
  node.morphogenB = b;
  world.signalA[i] = clamp(a + node.genome.diffusionA * 0.01, 0, 1.2);
  world.signalB[i] = clamp(b + node.genome.diffusionB * 0.008, 0, 1.2);
}

function headingForChild(parent: LifeNode, index: number): number {
  const golden = goldenHeading(index, parent.heading);
  const alternate = parent.heading + ((parent.genome.branchAngle * Math.PI) / 180) * (index % 2 === 0 ? 1 : -1);
  const t = clamp(parent.genome.fibonacciWeight, 0, 1);
  return golden * t + alternate * (1 - t);
}

function growBranch(parent: LifeNode, world: ALifeWorld, rng: Rng): LifeNode | null {
  if (parent.state === "dead" || parent.state === "dormant") return null;
  if (parent.depth >= MAX_DEPTH) return null;
  if (parent.children.length >= MAX_BRANCHES) return null;
  if (livingOf(world).length >= MAX_NODES) return null;

  const structural = parent.morphogenA > 0.55 || parent.kind === "seed";
  const appendage = parent.morphogenA > 0.28 && Math.abs(parent.morphogenA / Math.max(parent.morphogenB, 0.05) - 1.2) < 0.45;
  if (parent.kind === "soma" && !structural && !appendage) return null;

  const need = growthThreshold(parent.children.length, parent.genome.fibonacciWeight);
  if (parent.energy < need || parent.matter < 2) return null;

  const heading = headingForChild(parent, parent.children.length);
  const length = parent.length * parent.genome.growthRatio;
  const radius = parent.radius * parent.genome.radiusRatio;
  const child = createNode(world, rng, {
    age: 0,
    energy: need * 0.28,
    matter: 2,
    health: clamp(parent.health + rng.float(-6, 4), 30, 100),
    genome: parent.genome,
    x: clamp(parent.x + Math.cos(heading) * length, 2, world.width * world.cell - 2),
    y: clamp(parent.y + Math.sin(heading) * length, 2, world.height * world.cell - 2),
    z: parent.z + 0.4,
    heading,
    length,
    radius,
    parentId: parent.id,
    generation: parent.generation,
    depth: parent.depth + 1,
    kind: "soma",
    chaos: parent.chaos,
    morphogenA: parent.morphogenA,
    morphogenB: parent.morphogenB,
    state: "growing",
  });
  parent.energy = Math.max(0, parent.energy - need * 0.42);
  parent.matter = Math.max(0, parent.matter - 2);
  parent.children.push(child.id);
  parent.connections.push(child.id);
  child.connections.push(parent.id);
  return child;
}

function behave(node: LifeNode, world: ALifeWorld): void {
  if (node.kind !== "seed" || node.state === "dormant" || node.state === "dead") return;
  const i = cellAt(world, node.x, node.y);
  const here = world.nutrients[i] ?? 0;
  const probes: Array<[number, number]> = [
    [node.x + 10, node.y],
    [node.x - 10, node.y],
    [node.x, node.y + 10],
    [node.x, node.y - 10],
  ];
  let best = here;
  let tx = node.x;
  let ty = node.y;
  for (const [px, py] of probes) {
    const value = world.nutrients[cellAt(world, px, py)] ?? 0;
    if (value > best) {
      best = value;
      tx = px;
      ty = py;
    }
  }
  if (best <= here + 0.02) return;
  const cost = node.genome.movementCost;
  if (node.energy <= cost + 4) return;
  node.x += (tx - node.x) * 0.12;
  node.y += (ty - node.y) * 0.12;
  node.energy = Math.max(0, node.energy - cost);
}

function repair(node: LifeNode): void {
  if (node.health >= 96 || node.energy < 10) return;
  const spend = node.genome.repairRate * 2.2;
  node.energy = Math.max(0, node.energy - spend);
  node.health = clamp(node.health + node.genome.repairRate * 6, 0, 100);
}

function mateOf(node: LifeNode, neighbors: LifeNode[]): LifeNode | undefined {
  return neighbors.find(
    (other) =>
      other.kind === "seed" &&
      other.state !== "dead" &&
      other.id !== node.id &&
      other.energy > other.genome.reproductionThreshold * 0.55,
  );
}

function reproduce(node: LifeNode, neighbors: LifeNode[], world: ALifeWorld, rng: Rng): LifeNode | null {
  if (node.kind !== "seed" || node.state !== "reproducing") return null;
  if (livingOf(world).length >= MAX_NODES) return null;
  const cost = node.genome.reproductionThreshold * 0.42;
  if (node.energy < node.genome.reproductionThreshold) return null;

  const mate = mateOf(node, neighbors);
  const genome: Genome = mate ? crossover(node.genome, mate.genome, rng) : mutate(node.genome, rng);
  const child = createNode(world, rng, {
    age: 0,
    energy: cost * 0.55,
    matter: 6,
    health: 78,
    genome,
    x: clamp(node.x + rng.float(-18, 18), 4, world.width * world.cell - 4),
    y: clamp(node.y + rng.float(-18, 18), 4, world.height * world.cell - 4),
    z: 0,
    heading: rng.float(0, Math.PI * 2),
    length: node.length * rng.float(0.9, 1.05),
    radius: node.radius * rng.float(0.9, 1.05),
    generation: Math.max(node.generation, mate?.generation ?? 0) + 1,
    depth: 0,
    kind: "seed",
    chaos: rng.float(0.15, 0.6),
    morphogenA: 0.35,
    morphogenB: 0.18,
    state: "seed",
  });
  node.energy = Math.max(0, node.energy - cost);
  if (mate) mate.energy = Math.max(0, mate.energy - cost * 0.25);
  world.generations = Math.max(world.generations, child.generation);
  return child;
}

function deathChance(node: LifeNode): number {
  const ageRisk = 1 - Math.exp(-node.age / 720);
  const healthRisk = (100 - node.health) / 140;
  const energyRisk = node.energy < 6 ? 0.18 : 0;
  return clamp(0.002 + ageRisk * 0.04 + healthRisk * 0.03 + energyRisk, 0, 0.35);
}

function ageAndDie(node: LifeNode, rng: Rng): void {
  node.age += 1;
  node.health = clamp(node.health - 0.012 - node.age / 18000, 0, 100);
  if (node.energy <= 0 || node.health <= 0) {
    node.state = "dead";
    return;
  }
  if (!canMaintain(node)) {
    node.state = "dead";
    return;
  }
  if (rng.chance(deathChance(node))) {
    node.state = "dead";
  }
}

function canMaintain(node: LifeNode): boolean {
  return node.energy > 1 && node.health > 4 && node.matter > 0;
}

function markDead(node: LifeNode, world: ALifeWorld): void {
  if (node.state !== "dead") return;
  world.deaths += 1;
}

function lifeTick(world: ALifeWorld, rng: Rng): void {
  updateEnvironment(world, rng);
  diffuseResources(world);
  diffuseChemicalSignals(world);

  const living = livingOf(world);
  const born: LifeNode[] = [];

  for (const node of living) {
    if (node.energy <= 0) {
      node.state = "dead";
      markDead(node, world);
      continue;
    }
    const neighbors = neighborsOf(node, living);
    metabolize(node, world);
    automata(node, neighbors);
    morphogenesis(node, world);
    const branch = growBranch(node, world, rng);
    if (branch) born.push(branch);
    behave(node, world);
    repair(node);
    const child = reproduce(node, neighbors, world, rng);
    if (child) born.push(child);
    ageAndDie(node, rng);
    if (node.state === "dead") markDead(node, world);
  }

  for (const node of born) {
    world.nodes[node.id] = node;
    world.births += 1;
  }
  world.tick += 1;
}

export class ALifeEngine {
  readonly world: ALifeWorld;
  private readonly rng: Rng;

  constructor(options: ALifeOptions = {}) {
    this.world = seedWorld(options);
    this.rng = new Rng(options.seed ?? 2026);
    this.rng.setState(this.world.rngState);
    plantStarters(this.world, this.rng, options.starters ?? 14);
    this.world.rngState = this.rng.getState();
  }

  step(ticks = 1): ALifeSummary {
    for (let i = 0; i < ticks; i += 1) {
      lifeTick(this.world, this.rng);
    }
    this.world.rngState = this.rng.getState();
    return this.summary();
  }

  living(): LifeNode[] {
    return livingOf(this.world);
  }

  summary(): ALifeSummary {
    const living = this.living();
    const seeds = living.filter((n) => n.kind === "seed");
    const count = Math.max(living.length, 1);
    return {
      tick: this.world.tick,
      living: living.length,
      seeds: seeds.length,
      meanEnergy: living.reduce((s, n) => s + n.energy, 0) / count,
      meanHealth: living.reduce((s, n) => s + n.health, 0) / count,
      meanBranchAngle: living.reduce((s, n) => s + n.genome.branchAngle, 0) / count,
      meanEfficiency: living.reduce((s, n) => s + 1 / Math.max(n.genome.metabolism, 0.05), 0) / count,
      births: this.world.births,
      deaths: this.world.deaths,
      generations: this.world.generations,
    };
  }
}

export { growthThreshold, seedGenome, mutate, crossover };
