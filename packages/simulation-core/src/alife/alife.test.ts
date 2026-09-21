import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Rng } from "../rng";
import { ALifeEngine, crossover, mutate } from "./engine";
import { seedGenome } from "./genome";
import { fibonacci, growthThreshold, logistic } from "./mathlife";

describe("artificial life substrate", () => {
  it("is deterministic for the same seed", () => {
    const a = new ALifeEngine({ seed: 2026, starters: 10 });
    const b = new ALifeEngine({ seed: 2026, starters: 10 });
    a.step(80);
    b.step(80);
    expect(a.summary()).toEqual(b.summary());
    expect(a.world.rngState).toBe(b.world.rngState);
  });

  it("keeps energy and matter non-negative", () => {
    const engine = new ALifeEngine({ seed: 9, starters: 12 });
    engine.step(120);
    for (const node of Object.values(engine.world.nodes)) {
      expect(node.energy).toBeGreaterThanOrEqual(0);
      expect(node.matter).toBeGreaterThanOrEqual(0);
    }
  });

  it("lets energy collapse kill a node without an isStrong check", () => {
    const engine = new ALifeEngine({ seed: 3, starters: 4 });
    const node = engine.living()[0];
    expect(node).toBeDefined();
    if (!node) return;
    node.energy = 0;
    node.health = 40;
    engine.step(1);
    expect(engine.world.nodes[node.id]?.state).toBe("dead");
  });

  it("copies a genome with variation", () => {
    const rng = new Rng(44);
    const parent = seedGenome(rng);
    const child = mutate(parent, rng);
    const changed = (Object.keys(parent) as (keyof typeof parent)[]).filter((key) => parent[key] !== child[key]);
    expect(changed.length).toBeGreaterThan(0);
    expect(Math.abs(child.branchAngle - parent.branchAngle)).toBeLessThan(40);
  });

  it("crosses two parents into a new program", () => {
    const rng = new Rng(12);
    const a = seedGenome(rng);
    const b = seedGenome(rng);
    const child = crossover(a, b, rng);
    expect(child.reproductionThreshold).toBeGreaterThan(40);
    expect(child.mutationRate).toBeGreaterThan(0);
  });

  it("uses Fibonacci as a rising growth schedule", () => {
    expect(fibonacci(0)).toBe(1);
    expect(fibonacci(5)).toBe(8);
    expect(fibonacci(7)).toBe(21);
    expect(growthThreshold(0, 0.72)).toBeGreaterThan(15);
    expect(growthThreshold(3, 0.72)).toBeGreaterThan(growthThreshold(1, 0.72));
    expect(growthThreshold(5, 0.72)).toBeGreaterThan(growthThreshold(3, 0.72));
  });

  it("lets near-identical initial conditions diverge", () => {
    const a = new ALifeEngine({ seed: 88, starters: 8 });
    const b = new ALifeEngine({ seed: 88, starters: 8 });
    const nodeB = b.living()[0];
    expect(nodeB).toBeDefined();
    if (!nodeB) return;
    nodeB.genome = { ...nodeB.genome, absorbRate: nodeB.genome.absorbRate * 0.9999, metabolism: nodeB.genome.metabolism + 0.0003 };
    a.step(200);
    b.step(200);
    const energyA = a.living().reduce((sum, n) => sum + n.energy, 0);
    const energyB = b.living().reduce((sum, n) => sum + n.energy, 0);
    const posA = a.living().reduce((sum, n) => sum + n.x + n.y, 0);
    const posB = b.living().reduce((sum, n) => sum + n.x + n.y, 0);
    expect(Math.abs(energyA - energyB) + Math.abs(posA - posB) + Math.abs(a.world.births - b.world.births)).toBeGreaterThan(0);
  });

  it("changes population through birth and decay", () => {
    const engine = new ALifeEngine({ seed: 17, starters: 16 });
    const before = engine.summary();
    engine.step(200);
    const after = engine.summary();
    expect(after.tick).toBe(200);
    expect(after.births).toBeGreaterThanOrEqual(before.births);
    expect(after.living + after.deaths).toBe(after.births);
  });

  it("treats the logistic map as sensitive chaos, not a life law", () => {
    const x = 0.4;
    expect(Math.abs(logistic(x, 3.7) - logistic(x + 1e-6, 3.7))).toBeGreaterThan(0);
  });

  it("does not import a renderer", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const files = ["engine.ts", "genome.ts", "mathlife.ts", "types.ts"];
    for (const file of files) {
      const source = readFileSync(join(here, file), "utf8");
      expect(source).not.toMatch(/three|@react-three/i);
    }
  });
});
