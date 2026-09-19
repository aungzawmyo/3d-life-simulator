import { describe, expect, it } from "vitest";
import { SimulationEngine } from "./engine";
import { buyHouse, marry, spouseOf } from "./life";

function engine(seed = 77): SimulationEngine {
  return new SimulationEngine({ seed, population: 12, playerAge: 29 });
}

describe("simulation engine", () => {
  it("is deterministic for the same seed", () => {
    const a = engine(2026);
    const b = engine(2026);
    a.runDays(8);
    b.runDays(8);
    expect(a.summary().averageHappiness).toBe(b.summary().averageHappiness);
    expect(a.summary().living).toBe(b.summary().living);
    expect(a.world.clock.totalMinutes).toBe(b.world.clock.totalMinutes);
    expect(a.world.rngState).toBe(b.world.rngState);
  });

  it("replays from a save", () => {
    const live = engine(11);
    live.runDays(4);
    const restored = SimulationEngine.load(live.save());
    expect(restored.world.clock.day).toBe(live.world.clock.day);
    expect(restored.player?.firstName).toBe(live.player?.firstName);
    restored.runDays(2);
    live.runDays(2);
    expect(restored.summary().events).toBe(live.summary().events);
  });

  it("lets sleep debt raise stress and cut work energy", () => {
    const sim = engine(3);
    const person = sim.player;
    expect(person).toBeDefined();
    if (!person) return;
    person.needs.sleep = 90;
    person.needs.energy = 40;
    person.hidden.sleepDebt = 10;
    person.stress = 20;
    person.activity = { type: "work", locationId: person.locationId, startedAt: 0, durationMinutes: 600 };
    sim.tick(60);
    expect(person.hidden.sleepDebt).toBeGreaterThan(10);
    expect(person.stress).toBeGreaterThan(20);
    expect(person.needs.energy).toBeLessThan(40);
  });

  it("treats happiness as a derived output", () => {
    const sim = engine(9);
    const person = sim.player;
    expect(person).toBeDefined();
    if (!person) return;
    const before = person.happiness;
    person.stress = 90;
    person.physicalHealth = 20;
    person.needs.belonging = 5;
    sim.tick(60);
    expect(person.happiness).not.toBe(before);
    expect(person.happiness).toBeLessThan(70);
  });
});

describe("life systems", () => {
  it("marries, bears a child, and buys a house", () => {
    const sim = engine(5);
    const player = sim.player;
    expect(player).toBeDefined();
    if (!player) return;
    const existing = spouseOf(player, sim.world);
    const other =
      existing ??
      Object.values(sim.world.people).find(
        (p) => p.id !== player.id && p.alive && p.ageYears >= 18 && !spouseOf(p, sim.world),
      );
    expect(other).toBeDefined();
    if (!other) return;

    if (!existing) expect(marry(sim.world, player, other)).toBe(true);
    expect(Object.values(player.relationships).some((r) => r.kind === "spouse")).toBe(true);

    player.ageYears = 30;
    expect(sim.act("have_child", undefined, player)).toBe(true);
    expect(player.childIds.length).toBeGreaterThan(0);
    const born = sim.world.people[player.childIds[0] ?? ""];
    expect(born?.ageYears).toBe(0);
    expect(born?.parentIds).toContain(player.id);

    player.finances.cash = 200000;
    player.finances.savings = 40000;
    expect(buyHouse(sim.world, player)).toBe(true);
    expect(player.ownsHome).toBe(true);
    expect(player.finances.debt).toBeGreaterThan(0);
  });

  it("applies for work and enrolls", () => {
    const sim = engine(14);
    const player = sim.player;
    expect(player).toBeDefined();
    if (!player) return;
    player.career.track = "unemployed";
    player.career.employerId = undefined;
    player.career.salaryMonthly = 0;
    player.ageYears = 20;
    player.education.level = "secondary";
    player.education.inSchool = false;
    expect(sim.act("apply_job", undefined, player)).toBe(true);
    expect(player.career.employerId).toBeTruthy();
    expect(sim.act("enroll", undefined, player)).toBe(true);
    expect(player.education.inSchool).toBe(true);
  });

  it("continues as an heir after the player dies", () => {
    const sim = engine(21);
    const player = sim.player;
    expect(player).toBeDefined();
    if (!player) return;
    const adult = Object.values(sim.world.people).find((p) => p.id !== player.id && p.alive && p.ageYears >= 18);
    expect(adult).toBeDefined();
    if (!adult) return;
    marry(sim.world, player, adult);
    player.ageYears = 32;
    expect(sim.act("have_child", undefined, player)).toBe(true);
    const heirId = player.childIds[0];
    expect(heirId).toBeTruthy();
    if (!heirId) return;
    const heir = sim.world.people[heirId];
    if (heir) heir.ageYears = 19;

    player.alive = false;
    player.causeOfDeath = "Test death";
    player.isPlayer = true;
    sim.world.pendingLegacy = {
      deceasedId: player.id,
      deceasedName: `${player.firstName} ${player.lastName}`,
      cause: "Test death",
      heirIds: [heirId],
      summary: sim.summary(),
    };
    const next = sim.continueAs(heirId);
    expect(next?.id).toBe(heirId);
    expect(next?.isPlayer).toBe(true);
    expect(sim.world.pendingLegacy).toBeUndefined();
    expect(sim.world.generation).toBe(next?.generation);
  });

  it("lists player actions without Three.js", () => {
    const sim = engine(2);
    const list = sim.actions();
    expect(list.some((a) => a.id === "sleep")).toBe(true);
    expect(list.some((a) => a.id === "exercise")).toBe(true);
  });
});
