import { advanceMinutes, formatClock } from "./clock";
import { applyMonthlyEconomy } from "./economy";
import { availableActions, continueAsHeir, performAction } from "./life";
import { Rng } from "./rng";
import { deserializeWorld, serializeWorld } from "./snapshot";
import { tickDay, tickHour, tickMinutes, tickMonth, tickYear } from "./systems";
import type { EngineOptions, LifeAction, Person, SimSpeed, SimulationSummary, WorldState } from "./types";
import { createWorld } from "./world";

export class SimulationEngine {
  readonly world: WorldState;
  private rng: Rng;

  constructor(options: EngineOptions = {}) {
    this.world = createWorld(options);
    this.rng = new Rng(this.world.seed);
    this.rng.setState(this.world.rngState);
  }

  static fromWorld(world: WorldState): SimulationEngine {
    const engine = new SimulationEngine({ seed: world.seed });
    (engine as { world: WorldState }).world = world;
    engine.rng = new Rng(world.seed);
    engine.rng.setState(world.rngState);
    return engine;
  }

  static load(json: string): SimulationEngine {
    return SimulationEngine.fromWorld(deserializeWorld(json));
  }

  setSpeed(speed: SimSpeed): void {
    this.world.clock.speed = speed;
  }

  get player(): Person | undefined {
    return Object.values(this.world.people).find((p) => p.isPlayer && p.alive)
      ?? Object.values(this.world.people).find((p) => p.isPlayer)
      ?? Object.values(this.world.people).find((p) => p.alive);
  }

  actions(person = this.player): LifeAction[] {
    if (!person) return [];
    return availableActions(this.world, person);
  }

  act(actionId: string, targetId?: string, actor = this.player): boolean {
    if (!actor) return false;
    const ok = performAction(this.world, this.rng, actor, actionId, targetId);
    this.world.rngState = this.rng.getState();
    return ok;
  }

  continueAs(heirId: string): Person | undefined {
    const heir = continueAsHeir(this.world, heirId);
    this.world.rngState = this.rng.getState();
    return heir;
  }

  save(): string {
    return serializeWorld(this.world);
  }

  tick(minutes = 1): void {
    if (minutes <= 0) return;
    const marks = advanceMinutes(this.world.clock, minutes);
    tickMinutes(this.world, this.rng, minutes);
    if (marks.crossedHour) tickHour(this.world, this.rng);
    if (marks.crossedDay) tickDay(this.world, this.rng);
    if (marks.crossedMonth) {
      applyMonthlyEconomy(this.world);
      tickMonth(this.world);
    }
    if (marks.crossedYear) tickYear(this.world, this.rng);
    this.world.rngState = this.rng.getState();
  }

  tickHour(): void {
    this.tick(60);
  }

  runMinutes(total: number, step = 15): void {
    let left = total;
    while (left > 0) {
      const slice = Math.min(step, left);
      this.tick(slice);
      left -= slice;
    }
  }

  runDays(days: number): void {
    this.runMinutes(days * 24 * 60, 60);
  }

  runYears(years: number): void {
    this.runDays(years * 365);
  }

  summary(daysSimulated = 0): SimulationSummary {
    const people = Object.values(this.world.people);
    const living = people.filter((p) => p.alive);
    const labor = living.filter((p) => p.ageYears >= 18 && p.ageYears < 63);
    const jobless = labor.filter((p) => p.career.track === "unemployed").length;
    return {
      daysSimulated,
      living: living.length,
      dead: people.length - living.length,
      averageHappiness: avg(living.map((p) => p.happiness)),
      averageHealth: avg(living.map((p) => p.physicalHealth)),
      unemployment: labor.length === 0 ? 0 : jobless / labor.length,
      totalCash: living.reduce((s, p) => s + p.finances.cash + p.finances.savings, 0),
      marriages: living.filter((p) => Object.values(p.relationships).some((r) => r.kind === "spouse")).length,
      births: this.world.timeline.filter((t) => t.kind === "child_born").length,
      homeowners: living.filter((p) => p.ownsHome).length,
      events: this.world.events.length,
    };
  }

  clockLabel(): string {
    return formatClock(this.world.clock);
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
