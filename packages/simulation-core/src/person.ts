import { clamp } from "./math";
import { randomName } from "./names";
import type { Rng } from "./rng";
import type {
  CareerState,
  Education,
  Finances,
  Gender,
  JobTrack,
  Person,
  Skill,
} from "./types";

const SKILL_IDS = [
  "programming",
  "language",
  "cooking",
  "driving",
  "business",
  "music",
  "sports",
  "leadership",
  "teaching",
  "medicine",
] as const;

export function competenceFromXp(xp: number): number {
  return clamp(100 * (1 - Math.exp(-xp / 1400)));
}

export function ensureSkill(person: Person, id: string, day: number): Skill {
  const existing = person.skills[id];
  if (existing) return existing;
  const created: Skill = { id, xp: 0, competence: 0, lastPracticedDay: day };
  person.skills[id] = created;
  return created;
}

export function practiceSkill(person: Person, id: string, xpGain: number, day: number): void {
  const skill = ensureSkill(person, id, day);
  skill.xp += xpGain;
  skill.competence = competenceFromXp(skill.xp);
  skill.lastPracticedDay = day;
}

export function decayUnusedSkills(person: Person, day: number): void {
  for (const skill of Object.values(person.skills)) {
    const idle = day - skill.lastPracticedDay;
    if (idle > 21 && skill.xp > 0) {
      skill.xp = Math.max(0, skill.xp - idle * 0.35);
      skill.competence = competenceFromXp(skill.xp);
    }
  }
}

function trait(rng: Rng, mean = 52, std = 14): number {
  return clamp(rng.normal(mean, std));
}

export function createPerson(
  rng: Rng,
  opts: {
    id: string;
    age: number;
    year: number;
    homeId: string;
    gender?: Gender;
    lastName?: string;
    isPlayer?: boolean;
  },
): Person {
  const gender = opts.gender ?? rng.pick<Gender>(["female", "male", "female", "male", "nonbinary"]);
  const name = randomName(rng, gender);
  const lastName = opts.lastName ?? name.lastName;
  const genetics = {
    heightPotential: rng.float(150, 190),
    metabolism: trait(rng, 50, 12),
    agingRate: clamp(rng.normal(50, 10), 20, 90),
    fertility: trait(rng, 55, 15),
    attractiveness: trait(rng, 50, 13),
    cardiovascularRisk: trait(rng, 30, 16),
    mentalHealthRisk: trait(rng, 28, 14),
  };

  const education = educationForAge(rng, opts.age);
  const career = careerForAge(rng, opts.age);
  const finances = startingFinances(rng, opts.age, career);

  const personality = {
    openness: trait(rng),
    discipline: trait(rng),
    confidence: trait(rng),
    empathy: trait(rng),
    riskTolerance: trait(rng),
    sociability: trait(rng),
    emotionalStability: trait(rng, 55, 16),
  };

  return {
    id: opts.id,
    firstName: name.firstName,
    lastName,
    gender,
    birthYear: opts.year - opts.age,
    nationality: "Thai",
    genetics,
    appearance: {
      heightCm: Math.round(genetics.heightPotential * (opts.age < 16 ? 0.72 + opts.age * 0.015 : 1)),
      weightKg: Math.round(clamp(rng.normal(62, 11), 18, 130)),
      attractiveness: genetics.attractiveness,
    },
    hidden: {
      cardiovascular: clamp(88 - genetics.cardiovascularRisk * 0.2 + rng.float(-6, 6)),
      nutrition: trait(rng, 70, 10),
      sleepDebt: rng.float(0, 18),
      injuryRisk: rng.float(4, 20),
      immune: trait(rng, 72, 10),
    },
    physicalHealth: trait(rng, 78, 10),
    mentalWellbeing: trait(rng, 70, 12),
    stress: trait(rng, 28, 12),
    happiness: 60,
    needs: {
      hunger: rng.float(10, 40),
      sleep: rng.float(5, 30),
      energy: rng.float(55, 90),
      fitness: trait(rng, 55, 14),
      purpose: trait(rng, 50, 14),
      confidence: personality.confidence,
      entertainment: rng.float(20, 55),
      satisfaction: trait(rng, 55, 12),
      belonging: trait(rng, 55, 14),
      reputation: trait(rng, 45, 12),
    },
    personality,
    aptitudes: {
      intelligence: trait(rng, 55, 14),
      creativity: trait(rng, 52, 15),
      discipline: personality.discipline,
      charisma: trait(rng, 50, 14),
      fitness: trait(rng, 52, 14),
    },
    skills: seedSkills(rng, opts.age, career.track),
    education,
    career,
    finances,
    relationships: {},
    familyIds: [],
    parentIds: [],
    childIds: [],
    memories: [],
    goals: [
      { id: "health", text: "Stay well enough to keep living the day", kind: "health", progress: 40 },
      { id: "career", text: "Build a living from what I can do", kind: "career", progress: 18 },
      { id: "family", text: "Keep someone who would notice if I vanished", kind: "family", progress: 12 },
    ],
    ageYears: opts.age,
    biologicalAge: opts.age + rng.float(-1.5, 2.5),
    lifeExpectancy: clamp(rng.normal(79, 6), 62, 98),
    homeId: opts.homeId,
    locationId: opts.homeId,
    ownsHome: false,
    homeValue: 0,
    generation: 1,
    activity: {
      type: "idle",
      locationId: opts.homeId,
      startedAt: 0,
      durationMinutes: 5,
    },
    alive: true,
    isPlayer: Boolean(opts.isPlayer),
  };
}

function educationForAge(rng: Rng, age: number): Education {
  if (age < 6) return { level: "none", inSchool: false };
  if (age < 13) return { level: "primary", inSchool: true };
  if (age < 18) return { level: "secondary", inSchool: true };
  if (age < 23) return { level: rng.chance(0.65) ? "bachelor" : "secondary", inSchool: true };
  return { level: age > 24 && rng.chance(0.55) ? "bachelor" : "secondary", inSchool: false };
}

function careerForAge(rng: Rng, age: number): CareerState {
  if (age < 15) {
    return emptyCareer("student", "Student", 0);
  }
  if (age >= 63) {
    return emptyCareer("retired", "Retired", 0);
  }
  if (age < 18) {
    return emptyCareer("student", "Student", 0);
  }

  const track = rng.pick<JobTrack>([
    "software",
    "retail",
    "healthcare",
    "education",
    "hospitality",
    "freelance",
    "unemployed",
  ]);
  if (track === "unemployed") {
    return emptyCareer("unemployed", "Unemployed", 0);
  }

  const titles: Record<string, string[]> = {
    software: ["Intern", "Junior Developer", "Developer", "Senior Developer", "Tech Lead"],
    retail: ["Shop Assistant", "Cashier", "Shift Lead", "Store Manager"],
    healthcare: ["Aide", "Nurse", "Senior Nurse", "Physician"],
    education: ["Teaching Assistant", "Teacher", "Senior Teacher", "Head Teacher"],
    hospitality: ["Waiter", "Cook", "Chef", "Restaurant Manager"],
    freelance: ["Freelancer", "Independent Contractor", "Studio Owner"],
  };
  const ladder = titles[track] ?? ["Worker"];
  const level = clamp(Math.round((age - 18) / 7), 0, ladder.length - 1);
  const salary = salaryFor(track, level);
  return {
    track,
    title: ladder[level] ?? "Worker",
    level,
    performance: rng.float(45, 75),
    experience: (age - 18) * 12,
    reputation: rng.float(30, 60),
    salaryMonthly: salary,
  };
}

function emptyCareer(track: JobTrack, title: string, salary: number): CareerState {
  return {
    track,
    title,
    level: 0,
    performance: 50,
    experience: 0,
    reputation: 20,
    salaryMonthly: salary,
  };
}

export function salaryFor(track: JobTrack, level: number): number {
  const base: Record<JobTrack, number> = {
    unemployed: 0,
    student: 0,
    retired: 12000,
    retail: 14000,
    software: 28000,
    healthcare: 22000,
    education: 18000,
    hospitality: 15000,
    freelance: 16000,
  };
  return Math.round((base[track] + level * 6500) * (track === "software" ? 1.15 : 1));
}

function startingFinances(rng: Rng, age: number, career: CareerState): Finances {
  const cash = Math.max(800, Math.round(career.salaryMonthly * rng.float(0.4, 1.8) + age * 400));
  return {
    cash,
    savings: Math.max(0, Math.round(cash * rng.float(0.2, 2.4) - (age < 25 ? 8000 : 0))),
    monthlyIncome: career.salaryMonthly,
    monthlyExpenses: 0,
    rentMonthly: age < 18 ? 0 : 6500 + Math.max(0, age - 25) * 80,
    debt: rng.chance(0.22) ? rng.int(5000, 80000) : 0,
  };
}

function seedSkills(rng: Rng, age: number, track: JobTrack): Record<string, Skill> {
  const skills: Record<string, Skill> = {};
  for (const id of SKILL_IDS) {
    const bonus = track === "software" && id === "programming" ? 900 : 0;
    const xp = Math.max(0, (age - 10) * rng.float(8, 40) + bonus);
    skills[id] = {
      id,
      xp,
      competence: competenceFromXp(xp),
      lastPracticedDay: 0,
    };
  }
  return skills;
}

export function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`;
}

export function relationshipSatisfaction(person: Person): number {
  const rels = Object.values(person.relationships);
  if (rels.length === 0) return 28;
  const scored = rels.map((r) => {
    const warmth = (r.affection + r.trust + r.respect + r.familiarity) / 4;
    return warmth - r.conflict * 0.7;
  });
  return clamp(scored.reduce((a, b) => a + b, 0) / scored.length);
}

export function financialSecurity(person: Person): number {
  const liquid = person.finances.cash + person.finances.savings;
  const burden = person.finances.debt + person.finances.rentMonthly * 3;
  const runway = liquid / Math.max(4000, burden);
  return clamp(25 + runway * 28 - (person.career.track === "unemployed" ? 18 : 0));
}
