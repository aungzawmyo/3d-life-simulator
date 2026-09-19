/** Deterministic mulberry32. Simulation must replay from seed + state. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  float(min = 0, max = 1): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("Rng.pick called with an empty list");
    }
    return items[this.int(0, items.length - 1)] as T;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  normal(mean = 0, std = 1): number {
    const u = Math.max(this.next(), 1e-9);
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    return mean + std * mag * Math.cos(2 * Math.PI * v);
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}
