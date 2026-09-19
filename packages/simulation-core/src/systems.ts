import { clamp } from "./math";
import { chooseActivity } from "./ai";
import { isWorkHours } from "./clock";
import { spend } from "./economy";
import { celebrate, pushTimeline, rollDailyEvents } from "./events";
import { rollJsonEvents } from "./jsonEvents";
import { offerLegacy, yearlyLife } from "./life";
import { recomputeHappiness } from "./happiness";
import { decayMemories, remember } from "./memory";
import { decayUnusedSkills, practiceSkill, salaryFor } from "./person";
import { driftDaily, interact, maybeRomance, quality } from "./relationships";
import type { Rng } from "./rng";
import type { Person, WorldState } from "./types";

export function tickMinutes(world: WorldState, rng: Rng, minutes: number): void {
  for (const person of living(world)) {
    person.activity.durationMinutes -= minutes;
    if (person.activity.type === "commute" && person.activity.durationMinutes <= 0) {
      move(world, person, person.activity.locationId);
    }
    if (person.activity.durationMinutes <= 0) {
      finishActivity(person, world, rng);
      person.activity = chooseActivity(person, world, rng);
      if (person.activity.type !== "commute") {
        move(world, person, person.activity.locationId);
      }
    }
  }
}

export function tickHour(world: WorldState, rng: Rng): void {
  for (const person of living(world)) {
    const acting = person.activity.type;
    const sleeping = acting === "sleep";

    person.needs.hunger = clamp(person.needs.hunger + (sleeping ? 1.1 : 3.2));
    person.needs.sleep = clamp(person.needs.sleep + (sleeping ? -14 : 3.4));
    person.needs.energy = clamp(
      person.needs.energy +
        (sleeping ? 11 : -3.3) -
        person.needs.hunger * 0.015 -
        person.hidden.sleepDebt * 0.02,
    );

    if (!sleeping && person.needs.sleep > 60) {
      person.hidden.sleepDebt = clamp(person.hidden.sleepDebt + 2.2, 0, 80);
      person.stress = clamp(person.stress + 1.4);
      person.needs.energy = clamp(person.needs.energy - 2);
    }
    if (sleeping) {
      person.hidden.sleepDebt = clamp(person.hidden.sleepDebt - 3.5, 0, 80);
      person.stress = clamp(person.stress - 1.8);
    }

    if (acting === "work") {
      const capacity = person.needs.energy * 0.45 + person.personality.discipline * 0.25 - person.stress * 0.2;
      person.career.performance = clamp(person.career.performance * 0.94 + capacity * 0.06);
      person.stress = clamp(person.stress + (world.economy.recession ? 1.6 : 0.7));
      person.needs.purpose = clamp(person.needs.purpose + 1.1);
      person.needs.entertainment = clamp(person.needs.entertainment + 2.4);
    } else {
      person.career.performance = clamp(person.career.performance - (isWorkHours(world.clock) ? 0.15 : 0.02));
    }

    if (acting === "recreation") person.needs.entertainment = clamp(person.needs.entertainment - 10);
    if (acting === "exercise") {
      person.needs.fitness = clamp(person.needs.fitness + 3);
      person.needs.energy = clamp(person.needs.energy - 4);
    }

    person.mentalWellbeing = clamp(
      person.mentalWellbeing +
        (person.personality.emotionalStability - 50) * 0.01 -
        person.stress * 0.03 +
        (person.needs.belonging - 50) * 0.01,
    );

    if (person.needs.energy < 30) {
      person.career.performance = clamp(person.career.performance - 0.8);
    }
    recomputeHappiness(person);
  }
  void rng;
}

export function tickDay(world: WorldState, rng: Rng): void {
  const dayIndex = Math.floor(world.clock.totalMinutes / (60 * 24));
  pushTimeline(
    world,
    "dawn",
    `${world.city.district} · day ${dayIndex + 1}. Demand ${(world.economy.consumerDemand * 100).toFixed(0)}%.`,
  );
  for (const person of living(world)) {
    person.hidden.nutrition = clamp(person.hidden.nutrition + (person.needs.hunger < 40 ? 1.2 : -1.6));
    person.physicalHealth = clamp(
      person.physicalHealth * 0.985 +
        person.hidden.cardiovascular * 0.008 +
        person.hidden.nutrition * 0.006 +
        person.needs.fitness * 0.004 -
        person.hidden.sleepDebt * 0.03 -
        person.genetics.cardiovascularRisk * 0.01,
    );
    person.hidden.cardiovascular = clamp(
      person.hidden.cardiovascular - person.stress * 0.02 + person.needs.fitness * 0.015,
    );

    if (person.finances.cash < 1500 && person.ageYears >= 18) {
      person.stress = clamp(person.stress + 5);
      person.needs.satisfaction = clamp(person.needs.satisfaction - 3);
    }

    driftDaily(person);
    for (const rel of Object.values(person.relationships)) {
      const other = world.people[rel.otherId];
      if (!other) continue;
      if (quality(rel) < 35) {
        other.mentalWellbeing = clamp(other.mentalWellbeing - 0.2);
      }
    }

    decayMemories(person);
    decayUnusedSkills(person, dayIndex);
    recomputeHappiness(person);
  }
  rollDailyEvents(world, rng);
  rollJsonEvents(world, rng);
}

export function tickMonth(world: WorldState): void {
  for (const person of living(world)) {
    if (person.career.performance > 78 && person.career.employerId && person.career.track !== "unemployed") {
      person.career.experience += 1;
      person.career.reputation = clamp(person.career.reputation + 2);
      if (person.career.performance > 88 && person.career.level < 5) {
        person.career.level += 1;
        person.career.salaryMonthly = salaryFor(person.career.track, person.career.level);
        person.career.title = `${person.career.title}`.replace("Junior ", "");
        celebrate(world, person, "promoted", `${person.firstName} was promoted to ${person.career.title}.`);
      }
    }
  }
}

export function tickYear(world: WorldState, rng: Rng): void {
  for (const person of living(world)) {
    person.ageYears += 1;
    person.biologicalAge += 1 * (0.85 + person.genetics.agingRate / 200) + (100 - person.physicalHealth) / 220;
    person.appearance.attractiveness = clamp(person.appearance.attractiveness - (person.ageYears > 35 ? 0.4 : 0.05));

    if (person.ageYears === 6) {
      person.education.level = "primary";
      person.education.inSchool = true;
      celebrate(world, person, "school", `${person.firstName} started school.`);
    }
    if (person.ageYears === 18) {
      if (!person.education.inSchool) {
        if (person.career.track === "student") {
          person.career.track = "unemployed";
          person.career.title = "Unemployed";
        }
      }
      celebrate(world, person, "adult", `${person.firstName} turned 18.`);
    }
    yearlyLife(world, rng, person);
    if (person.ageYears === 63 && person.career.track !== "unemployed") {
      person.career.track = "retired";
      person.career.title = "Retired";
      person.career.salaryMonthly = 12000;
      person.career.employerId = undefined;
      celebrate(world, person, "retired", `${person.firstName} retired.`);
    }

    if (person.biologicalAge > person.lifeExpectancy && rng.chance(0.35 + (person.biologicalAge - person.lifeExpectancy) / 20)) {
      die(world, person, "The body reached the end of its account.");
    } else if (person.physicalHealth < 8 && rng.chance(0.4)) {
      die(world, person, "Health failed after a long decline.");
    }
  }
}

function finishActivity(person: Person, world: WorldState, rng: Rng): void {
  const act = person.activity;
  switch (act.type) {
    case "eat":
      person.needs.hunger = clamp(person.needs.hunger - 38);
      spend(person, person.locationId === "shop" || person.locationId === "cafe" ? 180 : 60);
      break;
    case "cook":
      person.needs.hunger = clamp(person.needs.hunger - 42);
      practiceSkill(person, "cooking", 12, dayNumber(world));
      spend(person, 70);
      break;
    case "work":
      practiceJobSkill(person, world);
      person.career.experience += 0.2;
      break;
    case "study":
      practiceSkill(person, "language", 10, dayNumber(world));
      person.aptitudes.intelligence = clamp(person.aptitudes.intelligence + 0.02);
      person.needs.purpose = clamp(person.needs.purpose + 2);
      break;
    case "shop":
      spend(person, rng.int(80, 420));
      person.needs.entertainment = clamp(person.needs.entertainment - 6);
      break;
    case "socialize": {
      const other = act.targetId ? world.people[act.targetId] : undefined;
      if (other?.alive) {
        interact(person, other, rng, 1);
        if (maybeRomance(person, other, rng)) {
          remember(person, world, {
            type: "romance",
            text: `Something shifted with ${other.firstName}.`,
            participantIds: [person.id, other.id],
            emotionalImpact: 22,
            importance: 70,
          });
        }
        person.needs.belonging = clamp(person.needs.belonging + 7);
        person.needs.entertainment = clamp(person.needs.entertainment - 5);
      }
      break;
    }
    case "recreation":
      person.needs.entertainment = clamp(person.needs.entertainment - 18);
      person.stress = clamp(person.stress - 4);
      spend(person, rng.int(40, 220));
      break;
    case "exercise":
      practiceSkill(person, "sports", 14, dayNumber(world));
      person.needs.fitness = clamp(person.needs.fitness + 5);
      person.hidden.cardiovascular = clamp(person.hidden.cardiovascular + 1.2);
      break;
    case "hospital":
      person.physicalHealth = clamp(person.physicalHealth + 10);
      person.hidden.immune = clamp(person.hidden.immune + 8);
      spend(person, 900);
      break;
    case "sleep":
      person.needs.sleep = clamp(person.needs.sleep - 20);
      break;
    default:
      break;
  }
}

function practiceJobSkill(person: Person, world: WorldState): void {
  const day = dayNumber(world);
  const map: Record<string, string> = {
    software: "programming",
    education: "teaching",
    healthcare: "medicine",
    hospitality: "cooking",
    freelance: "business",
    retail: "language",
  };
  const skill = map[person.career.track] ?? "business";
  practiceSkill(person, skill, 16, day);
  if (person.career.track === "software") practiceSkill(person, "leadership", 4, day);
}

function move(world: WorldState, person: Person, locationId: string): void {
  const from = world.places[person.locationId];
  if (from) from.occupantIds = from.occupantIds.filter((id) => id !== person.id);
  person.locationId = locationId;
  const to = world.places[locationId];
  if (to && !to.occupantIds.includes(person.id)) to.occupantIds.push(person.id);
}

function living(world: WorldState): Person[] {
  return Object.values(world.people).filter((p) => p.alive);
}

function dayNumber(world: WorldState): number {
  return Math.floor(world.clock.totalMinutes / (60 * 24));
}

function die(world: WorldState, person: Person, cause: string): void {
  person.alive = false;
  person.causeOfDeath = cause;
  person.activity = { type: "idle", locationId: person.homeId, startedAt: world.clock.totalMinutes, durationMinutes: 0 };
  const from = world.places[person.locationId];
  if (from) from.occupantIds = from.occupantIds.filter((id) => id !== person.id);
  celebrate(world, person, "death", `${person.firstName} ${person.lastName} died. ${cause}`);
  inherit(world, person);
  if (person.isPlayer) {
    const living = Object.values(world.people).filter((p) => p.alive);
    offerLegacy(world, person, {
      daysSimulated: Math.floor(world.clock.totalMinutes / (60 * 24)),
      living: living.length,
      dead: Object.values(world.people).length - living.length,
      averageHappiness: living.reduce((s, p) => s + p.happiness, 0) / Math.max(1, living.length),
      averageHealth: living.reduce((s, p) => s + p.physicalHealth, 0) / Math.max(1, living.length),
      unemployment: 0,
      totalCash: living.reduce((s, p) => s + p.finances.cash, 0),
      marriages: living.filter((p) => Object.values(p.relationships).some((r) => r.kind === "spouse")).length,
      births: world.timeline.filter((t) => t.kind === "child_born").length,
      homeowners: living.filter((p) => p.ownsHome).length,
      events: world.events.length,
    });
  }
}

function inherit(world: WorldState, person: Person): void {
  const heirs = person.familyIds.map((id) => world.people[id]).filter((p): p is Person => Boolean(p?.alive));
  if (heirs.length === 0) return;
  const estate = Math.max(0, person.finances.cash + person.finances.savings - person.finances.debt);
  const share = estate / heirs.length;
  for (const heir of heirs) {
    heir.finances.savings += share;
    remember(heir, world, {
      type: "legacy",
      text: `Inherited ฿${Math.round(share).toLocaleString()} from ${person.firstName}.`,
      participantIds: [heir.id, person.id],
      emotionalImpact: -6,
      importance: 85,
    });
  }
}
