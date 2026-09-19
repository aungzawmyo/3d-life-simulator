import { celebrate, recordEvent } from "./events";
import { remember } from "./memory";
import { clamp } from "./math";
import { createPerson, fullName, salaryFor } from "./person";
import { pair } from "./relationships";
import type { Rng } from "./rng";
import type { LifeAction, Person, SimulationSummary, WorldState } from "./types";

export function spouseOf(person: Person, world: WorldState): Person | undefined {
  const rel = Object.values(person.relationships).find((r) => r.kind === "spouse");
  return rel ? world.people[rel.otherId] : undefined;
}

export function romanticOf(person: Person, world: WorldState): Person | undefined {
  const rel = Object.values(person.relationships)
    .filter((r) => r.kind === "romantic" || r.kind === "spouse")
    .sort((a, b) => b.affection - a.affection)[0];
  return rel ? world.people[rel.otherId] : undefined;
}

export function marry(world: WorldState, a: Person, b: Person): boolean {
  if (!a.alive || !b.alive || a.id === b.id) return false;
  if (a.ageYears < 18 || b.ageYears < 18) return false;
  if (spouseOf(a, world) || spouseOf(b, world)) return false;
  pair(a, b, "spouse", {
    familiarity: 88,
    trust: 80,
    affection: 84,
    respect: 76,
    attraction: 70,
    conflict: 12,
    dependency: 48,
  });
  if (!a.familyIds.includes(b.id)) a.familyIds.push(b.id);
  if (!b.familyIds.includes(a.id)) b.familyIds.push(a.id);
  b.lastName = a.lastName;
  b.homeId = a.homeId;
  a.goals = a.goals.map((g) => (g.kind === "family" ? { ...g, progress: clamp(g.progress + 35) } : g));
  remember(a, world, {
    type: "marriage",
    text: `Married ${fullName(b)}.`,
    participantIds: [a.id, b.id],
    emotionalImpact: 28,
    importance: 92,
  });
  remember(b, world, {
    type: "marriage",
    text: `Married ${fullName(a)}.`,
    participantIds: [b.id, a.id],
    emotionalImpact: 28,
    importance: 92,
  });
  celebrate(world, a, "married", `${fullName(a)} married ${fullName(b)}.`);
  return true;
}

export function haveChild(world: WorldState, rng: Rng, parent: Person): Person | undefined {
  const partner = spouseOf(parent, world) ?? romanticOf(parent, world);
  if (!parent.alive || parent.ageYears < 18 || parent.ageYears > 48) return undefined;
  if (parent.childIds.length >= 4) return undefined;
  const child = createPerson(rng, {
    id: `p_${world.nextId++}`,
    age: 0,
    year: world.clock.year,
    homeId: parent.homeId,
    lastName: parent.lastName,
  });
  child.generation = Math.max(parent.generation, partner?.generation ?? 1) + 1;
  child.parentIds = partner ? [parent.id, partner.id] : [parent.id];
  child.education = { level: "none", inSchool: false };
  child.career.track = "student";
  child.career.title = "Infant";
  child.finances.cash = 0;
  child.finances.rentMonthly = 0;
  linkParent(world, parent, child);
  if (partner) linkParent(world, partner, child);
  world.people[child.id] = child;
  const room = world.places[child.homeId];
  room?.occupantIds.push(child.id);
  celebrate(world, parent, "child_born", `${fullName(child)} was born to ${parent.firstName}.`);
  return child;
}

function linkParent(world: WorldState, parent: Person, child: Person): void {
  pair(parent, child, "family", {
    familiarity: 95,
    trust: 88,
    affection: 92,
    respect: 70,
    conflict: 6,
    dependency: 72,
  });
  if (!parent.familyIds.includes(child.id)) parent.familyIds.push(child.id);
  if (!child.familyIds.includes(parent.id)) child.familyIds.push(parent.id);
  if (!parent.childIds.includes(child.id)) parent.childIds.push(child.id);
  remember(parent, world, {
    type: "family",
    text: `${fullName(child)} was born.`,
    participantIds: [parent.id, child.id],
    emotionalImpact: 30,
    importance: 94,
  });
}

export function buyHouse(world: WorldState, person: Person): boolean {
  if (!person.alive || person.ageYears < 18 || person.ownsHome) return false;
  const liquid = person.finances.cash + person.finances.savings;
  const price = 820000;
  const down = 180000;
  if (liquid < down) return false;
  let remaining = down;
  const fromSavings = Math.min(person.finances.savings, remaining);
  person.finances.savings -= fromSavings;
  remaining -= fromSavings;
  person.finances.cash -= remaining;
  person.ownsHome = true;
  person.homeValue = price;
  person.finances.debt += price - down;
  person.finances.rentMonthly = 16500;
  person.goals = person.goals.map((g) => (g.kind === "wealth" || g.kind === "family" ? { ...g, progress: clamp(g.progress + 20) } : g));
  remember(person, world, {
    type: "housing",
    text: `Bought a home in ${world.city.district} for ฿${price.toLocaleString()}.`,
    emotionalImpact: 18,
    importance: 80,
  });
  celebrate(world, person, "house_purchased", `${person.firstName} bought a home in ${world.city.district}.`);
  return true;
}

export function enrollUniversity(world: WorldState, person: Person): boolean {
  if (!person.alive || person.ageYears < 18 || person.ageYears > 30) return false;
  if (person.education.level === "bachelor" || person.education.level === "master") return false;
  person.education.level = "bachelor";
  person.education.inSchool = true;
  person.education.schoolId = "school";
  if (person.career.track === "unemployed") {
    person.career.track = "student";
    person.career.title = "University student";
    person.career.salaryMonthly = 0;
  }
  celebrate(world, person, "university", `${person.firstName} enrolled at university.`);
  return true;
}

export function graduate(world: WorldState, person: Person): void {
  if (!person.education.inSchool) return;
  person.education.inSchool = false;
  if (person.ageYears >= 22 && person.education.level === "bachelor") {
    person.education.level = "bachelor";
    celebrate(world, person, "graduated", `${person.firstName} finished a degree.`);
  }
  if (person.career.track === "student") {
    person.career.track = "unemployed";
    person.career.title = "Unemployed";
  }
}

export function applyForJob(world: WorldState, person: Person): boolean {
  if (!person.alive || person.ageYears < 18 || person.ageYears >= 63) return false;
  const open = Object.values(world.businesses).filter((b) => b.hiring || b.employeeIds.length < 6);
  const ranked = open.sort((a, b) => {
    const skillA = skillForIndustry(person, a.industry);
    const skillB = skillForIndustry(person, b.industry);
    return skillB - skillA;
  });
  const business = ranked[0];
  if (!business) return false;
  if (person.career.employerId) {
    const prev = world.businesses[person.career.employerId];
    if (prev) prev.employeeIds = prev.employeeIds.filter((id) => id !== person.id);
  }
  person.career.track = business.industry;
  person.career.employerId = business.id;
  person.career.level = person.education.level === "bachelor" || person.education.level === "master" ? 1 : 0;
  person.career.title = starterTitle(business.industry, person.career.level);
  person.career.salaryMonthly = salaryFor(business.industry, person.career.level);
  person.career.performance = 55;
  if (!business.employeeIds.includes(person.id)) business.employeeIds.push(person.id);
  celebrate(world, person, "job_started", `${person.firstName} joined ${business.name} as ${person.career.title}.`);
  return true;
}

function skillForIndustry(person: Person, industry: string): number {
  const map: Record<string, string> = {
    software: "programming",
    education: "teaching",
    healthcare: "medicine",
    hospitality: "cooking",
    retail: "language",
    freelance: "business",
  };
  return person.skills[map[industry] ?? "business"]?.competence ?? 0;
}

function starterTitle(industry: string, level: number): string {
  const titles: Record<string, string[]> = {
    software: ["Intern", "Junior Developer"],
    retail: ["Shop Assistant", "Cashier"],
    healthcare: ["Aide", "Nurse"],
    education: ["Teaching Assistant", "Teacher"],
    hospitality: ["Waiter", "Cook"],
    freelance: ["Freelancer", "Independent Contractor"],
  };
  return titles[industry]?.[level] ?? "Worker";
}

export function availableActions(world: WorldState, person: Person): LifeAction[] {
  const actions: LifeAction[] = [
    { id: "sleep", label: "Sleep", detail: "Recover energy and pay down sleep debt." },
    { id: "eat", label: "Eat", detail: "Reduce hunger. Costs a little cash." },
    { id: "exercise", label: "Exercise", detail: "Fitness now, cardiovascular later." },
    { id: "socialize", label: "Socialize", detail: "Seek company. Memories follow." },
    { id: "clinic", label: "Clinic", detail: "Treat the body. Expensive." },
  ];
  if (person.ageYears >= 6 && (person.education.inSchool || person.ageYears < 26)) {
    actions.push({ id: "study", label: "Study", detail: "Practice, then competence, then options." });
  }
  if (person.ageYears >= 18 && person.career.track !== "retired") {
    actions.push({ id: "work", label: "Work", detail: "Show up. Performance is not a slogan." });
    if (person.career.track === "unemployed" || !person.career.employerId) {
      actions.push({ id: "apply_job", label: "Apply for work", detail: "Match skills to a hiring shop." });
    }
  }
  if (person.ageYears >= 18 && person.ageYears <= 30 && person.education.level !== "bachelor" && person.education.level !== "master") {
    actions.push({ id: "enroll", label: "Enroll at university", detail: "A degree is a door, not a life." });
  }
  const partner = romanticOf(person, world);
  if (partner && !spouseOf(person, world) && person.ageYears >= 18) {
    actions.push({
      id: "marry",
      label: `Marry ${partner.firstName}`,
      detail: "Turn affection into a household.",
      targetId: partner.id,
    });
  }
  if ((spouseOf(person, world) || partner) && person.ageYears >= 18 && person.ageYears <= 48 && person.childIds.length < 4) {
    actions.push({ id: "have_child", label: "Have a child", detail: "A new generation enters the block." });
  }
  if (!person.ownsHome && person.ageYears >= 18 && person.finances.cash + person.finances.savings >= 180000) {
    actions.push({ id: "buy_house", label: "Buy a home", detail: "Down payment ฿180,000. The rest is debt." });
  }
  return actions;
}

export function performAction(world: WorldState, rng: Rng, person: Person, actionId: string, targetId?: string): boolean {
  if (!person.alive) return false;
  switch (actionId) {
    case "sleep":
      person.activity = { type: "sleep", locationId: person.homeId, startedAt: world.clock.totalMinutes, durationMinutes: 180 };
      return true;
    case "eat":
      person.activity = { type: "eat", locationId: person.homeId, startedAt: world.clock.totalMinutes, durationMinutes: 30 };
      return true;
    case "work":
      person.activity = {
        type: "work",
        locationId: person.career.employerId ? world.businesses[person.career.employerId]?.placeId ?? person.locationId : person.locationId,
        startedAt: world.clock.totalMinutes,
        durationMinutes: 90,
      };
      return true;
    case "study":
      person.activity = { type: "study", locationId: "school", startedAt: world.clock.totalMinutes, durationMinutes: 80 };
      return true;
    case "exercise":
      person.activity = { type: "exercise", locationId: "park", startedAt: world.clock.totalMinutes, durationMinutes: 50 };
      return true;
    case "socialize":
      person.activity = { type: "socialize", locationId: "park", startedAt: world.clock.totalMinutes, durationMinutes: 50, targetId };
      return true;
    case "clinic":
      person.activity = { type: "hospital", locationId: "hospital", startedAt: world.clock.totalMinutes, durationMinutes: 80 };
      return true;
    case "apply_job":
      return applyForJob(world, person);
    case "enroll":
      return enrollUniversity(world, person);
    case "marry": {
      const other = (targetId ? world.people[targetId] : romanticOf(person, world));
      return other ? marry(world, person, other) : false;
    }
    case "have_child":
      return Boolean(haveChild(world, rng, person));
    case "buy_house":
      return buyHouse(world, person);
    default:
      return false;
  }
}

export function yearlyLife(world: WorldState, rng: Rng, person: Person): void {
  if (person.ageYears === 13) {
    person.education.level = "secondary";
    person.education.inSchool = true;
    celebrate(world, person, "school", `${person.firstName} entered secondary school.`);
  }
  if (person.ageYears === 18 && person.aptitudes.intelligence > 52 && rng.chance(0.55)) {
    enrollUniversity(world, person);
  }
  if (person.ageYears === 22 && person.education.inSchool) {
    graduate(world, person);
  }
  if (person.career.track === "unemployed" && person.ageYears >= 18 && person.ageYears < 63 && rng.chance(0.4)) {
    applyForJob(world, person);
  }
  const flame = romanticOf(person, world);
  if (flame && !spouseOf(person, world) && person.ageYears >= 22 && person.ageYears <= 45 && rng.chance(0.16)) {
    marry(world, person, flame);
  }
  if (spouseOf(person, world) && person.ageYears >= 22 && person.ageYears <= 42 && rng.chance(0.1)) {
    haveChild(world, rng, person);
  }
  if (!person.ownsHome && person.ageYears >= 28 && person.finances.cash + person.finances.savings > 220000 && rng.chance(0.12)) {
    buyHouse(world, person);
  }
  updateGoals(person, world);
}

export function updateGoals(person: Person, world: WorldState): void {
  const married = Boolean(spouseOf(person, world));
  person.goals = person.goals.map((goal) => {
    if (goal.kind === "health") return { ...goal, progress: clamp(person.physicalHealth * 0.7 + (100 - person.stress) * 0.2) };
    if (goal.kind === "career") return { ...goal, progress: clamp(person.career.experience + person.career.reputation * 0.3) };
    if (goal.kind === "family") return { ...goal, progress: clamp((married ? 40 : 10) + person.childIds.length * 18 + person.familyIds.length * 4) };
    return goal;
  });
}

export function continueAsHeir(world: WorldState, heirId: string): Person | undefined {
  const heir = world.people[heirId];
  if (!heir?.alive) return undefined;
  for (const person of Object.values(world.people)) person.isPlayer = false;
  heir.isPlayer = true;
  world.generation = heir.generation;
  world.pendingLegacy = undefined;
  recordEvent(world, "legacy_continue", `${fullName(heir)} continues the family.`, { generation: heir.generation }, heir.id);
  return heir;
}

export function offerLegacy(world: WorldState, deceased: Person, summary: SimulationSummary): void {
  const heirs = deceased.childIds
    .concat(deceased.familyIds)
    .map((id) => world.people[id])
    .filter((p): p is Person => Boolean(p?.alive));
  const unique = [...new Map(heirs.map((h) => [h.id, h])).values()];
  if (!deceased.isPlayer && unique.length === 0) return;
  world.pendingLegacy = {
    deceasedId: deceased.id,
    deceasedName: fullName(deceased),
    cause: deceased.causeOfDeath ?? "Death",
    heirIds: unique.map((h) => h.id),
    summary,
  };
}
