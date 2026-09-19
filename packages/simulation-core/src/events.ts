import { clamp } from "./math";
import { salaryFor } from "./person";
import { remember } from "./memory";
import { interact } from "./relationships";
import { endRecession, startRecession } from "./economy";
import type { Rng } from "./rng";
import type { EventDefinition, Person, WorldState } from "./types";

export function pushTimeline(world: WorldState, kind: string, text: string, personId?: string): void {
  world.timeline.push({
    id: `t_${world.nextId++}`,
    year: world.clock.year,
    month: world.clock.month,
    day: world.clock.day,
    kind,
    personId,
    text,
  });
  if (world.timeline.length > 400) world.timeline.splice(0, world.timeline.length - 400);
}

export function recordEvent(
  world: WorldState,
  definitionId: string,
  text: string,
  effects: Record<string, number>,
  personId?: string,
): void {
  world.events.unshift({
    id: `e_${world.nextId++}`,
    definitionId,
    timestamp: world.clock.totalMinutes,
    personId,
    text,
    effects,
  });
  if (world.events.length > 200) world.events.length = 200;
  pushTimeline(world, definitionId, text, personId);
}

const CATALOG: EventDefinition[] = [
  {
    id: "job_offer",
    weight: 0.04,
    text: (p) => `${p.firstName} received a better job offer.`,
    conditions: (p, world) =>
      p.ageYears >= 18 &&
      p.ageYears < 63 &&
      p.career.track !== "retired" &&
      (p.skills.programming?.competence ?? 0) + p.career.performance > 90 &&
      !world.economy.recession,
    apply: (p, world) => {
      p.career.level += 1;
      p.career.salaryMonthly = salaryFor(p.career.track, p.career.level);
      p.career.title = nextTitle(p.career.title);
      p.needs.confidence = clamp(p.needs.confidence + 8);
      p.stress = clamp(p.stress + 4);
      remember(p, world, {
        type: "career",
        text: "Accepted a better role after a quiet year of practice.",
        emotionalImpact: 18,
        importance: 72,
      });
      return { salary: p.career.salaryMonthly, stress: 4 };
    },
  },
  {
    id: "layoff",
    weight: 0.012,
    text: (p) => `${p.firstName} was laid off.`,
    conditions: (p, world) =>
      Boolean(p.career.employerId) &&
      p.career.track !== "student" &&
      p.career.track !== "retired" &&
      (world.economy.recession || p.career.performance < 38),
    apply: (p, world) => {
      const employer = p.career.employerId ? world.businesses[p.career.employerId] : undefined;
      if (employer) employer.employeeIds = employer.employeeIds.filter((id) => id !== p.id);
      p.career.track = "unemployed";
      p.career.title = "Unemployed";
      p.career.employerId = undefined;
      p.career.salaryMonthly = 0;
      p.stress = clamp(p.stress + 16);
      p.needs.purpose = clamp(p.needs.purpose - 12);
      p.needs.confidence = clamp(p.needs.confidence - 10);
      remember(p, world, {
        type: "career",
        text: "Lost a job. The silence afterward was louder than expected.",
        emotionalImpact: -24,
        importance: 80,
      });
      return { unemployed: 1, stress: 16 };
    },
  },
  {
    id: "illness",
    weight: 0.035,
    text: (p) => `${p.firstName} fell ill.`,
    conditions: (p) => p.hidden.immune < 55 || p.hidden.sleepDebt > 25 || p.physicalHealth < 50,
    apply: (p, world) => {
      p.physicalHealth = clamp(p.physicalHealth - 12);
      p.needs.energy = clamp(p.needs.energy - 18);
      p.hidden.immune = clamp(p.hidden.immune - 8);
      remember(p, world, {
        type: "health",
        text: "A fever forced a pause. The body keeps its own calendar.",
        emotionalImpact: -8,
        importance: 40,
      });
      return { health: -12 };
    },
  },
  {
    id: "helped_neighbor",
    weight: 0.05,
    text: (p) => `${p.firstName} helped someone in the neighborhood.`,
    conditions: (p) => p.personality.empathy > 55 && p.needs.energy > 30,
    apply: (p, world, rng) => {
      const other = rng.pick(Object.values(world.people).filter((o) => o.id !== p.id && o.alive));
      interact(p, other, rng, 1.4);
      p.needs.belonging = clamp(p.needs.belonging + 6);
      p.needs.reputation = clamp(p.needs.reputation + 4);
      remember(p, world, {
        type: "kindness",
        text: `Helped ${other.firstName} when it would have been easier not to.`,
        participantIds: [p.id, other.id],
        emotionalImpact: 12,
        importance: 48,
      });
      remember(other, world, {
        type: "kindness",
        text: `${p.firstName} helped me when I needed it.`,
        participantIds: [other.id, p.id],
        emotionalImpact: 16,
        importance: 55,
      });
      return { belonging: 6 };
    },
  },
  {
    id: "argument",
    weight: 0.04,
    text: (p) => `${p.firstName} had a sharp argument.`,
    conditions: (p) => p.stress > 45 && Object.keys(p.relationships).length > 0,
    apply: (p, world, rng) => {
      const otherId = rng.pick(Object.keys(p.relationships));
      const other = world.people[otherId];
      if (!other) return { conflict: 0 };
      const rel = p.relationships[otherId];
      if (rel) rel.conflict = clamp(rel.conflict + 14);
      p.mentalWellbeing = clamp(p.mentalWellbeing - 6);
      remember(p, world, {
        type: "conflict",
        text: `Harsh words with ${other.firstName}. Some of them stayed.`,
        participantIds: [p.id, other.id],
        emotionalImpact: -14,
        importance: 50,
      });
      return { conflict: 14 };
    },
  },
  {
    id: "windfall",
    weight: 0.012,
    text: (p) => `${p.firstName} received an unexpected payment.`,
    conditions: (p) => p.ageYears >= 18,
    apply: (p, world, rng) => {
      const amount = rng.int(4000, 22000);
      p.finances.cash += amount;
      p.needs.satisfaction = clamp(p.needs.satisfaction + 5);
      remember(p, world, {
        type: "money",
        text: `An unexpected ฿${amount.toLocaleString()} arrived.`,
        emotionalImpact: 10,
        importance: 36,
      });
      return { cash: amount };
    },
  },
  {
    id: "recession",
    weight: 0.008,
    text: () => "A recession settled over the city.",
    conditions: (_p, world) => !world.economy.recession && world.clock.day === 1,
    apply: (_p, world) => {
      startRecession(world);
      return { recession: 1 };
    },
  },
  {
    id: "recovery",
    weight: 0.01,
    text: () => "Consumer demand began to recover.",
    conditions: (_p, world) => world.economy.recession && world.clock.day === 1,
    apply: (_p, world) => {
      endRecession(world);
      return { recession: 0 };
    },
  },
];

export function rollDailyEvents(world: WorldState, rng: Rng): void {
  const living = Object.values(world.people).filter((p) => p.alive);
  for (const person of living) {
    for (const def of CATALOG) {
      if (!def.conditions(person, world)) continue;
      if (!rng.chance(def.weight)) continue;
      const effects = def.apply(person, world, rng);
      recordEvent(world, def.id, def.text(person, world), effects, person.id);
      if (def.id === "recession" || def.id === "recovery") return;
    }
  }
}

function nextTitle(current: string): string {
  const map: Record<string, string> = {
    Intern: "Junior Developer",
    "Junior Developer": "Developer",
    Developer: "Senior Developer",
    "Senior Developer": "Tech Lead",
    "Tech Lead": "Engineering Manager",
    "Shop Assistant": "Shift Lead",
    "Shift Lead": "Store Manager",
    Nurse: "Senior Nurse",
    Teacher: "Senior Teacher",
    Cook: "Chef",
    Freelancer: "Studio Owner",
    Unemployed: "Freelancer",
  };
  return map[current] ?? current;
}

export function celebrate(world: WorldState, person: Person, kind: string, text: string): void {
  recordEvent(world, kind, text, {}, person.id);
  remember(person, world, {
    type: kind,
    text,
    emotionalImpact: 20,
    importance: 75,
  });
}
