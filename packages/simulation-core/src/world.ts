import { createClock } from "./clock";
import { createEconomy } from "./economy";
import { createPerson, fullName } from "./person";
import { pair } from "./relationships";
import { remember } from "./memory";
import { Rng } from "./rng";
import type { Business, EngineOptions, Place, WorldState } from "./types";

export function createWorld(options: EngineOptions = {}): WorldState {
  const seed = options.seed ?? 2026;
  const rng = new Rng(seed);
  const year = options.startYear ?? 2026;
  const month = options.startMonth ?? 9;
  const day = options.startDay ?? 20;
  const population = options.population ?? 20;

  const places = createPlaces();
  const homes = Object.values(places).filter((p) => p.kind === "home");
  const businesses = createBusinesses(places);

  const world: WorldState = {
    seed,
    country: { id: "th", name: "Thailand", currency: "THB", currencySymbol: "฿" },
    city: { id: "bkk", name: "Bangkok", district: "Ari" },
    clock: createClock(year, month, day, 0),
    people: {},
    places,
    businesses,
    economy: createEconomy(),
    events: [],
    timeline: [],
    rngState: rng.getState(),
    nextId: 1,
    generation: 1,
  };

  seedHouseholds(world, rng, homes, population, options.playerAge ?? 27);
  assignJobs(world, rng);
  seedSocialGraph(world, rng);
  occupyPlaces(world);
  for (const person of Object.values(world.people)) {
    if (person.memories.length > 0) continue;
    remember(person, world, {
      type: "origin",
      text: `Woke up another morning in ${world.city.district}, ${world.city.name}.`,
      emotionalImpact: 4,
      importance: 20,
    });
  }

  world.rngState = rng.getState();
  return world;
}

function createPlaces(): Record<string, Place> {
  const list: Place[] = [
    place("home_a", "Apartment A — 4th floor", "home", 6),
    place("home_b", "Apartment B — 2nd floor", "home", 5),
    place("home_c", "Townhouse C", "home", 5),
    place("home_d", "Studio D", "home", 2),
    place("home_e", "Shared loft E", "home", 4),
    place("office", "Horizon Labs", "workplace", 16, "biz_horizon"),
    place("shop", "Ari Fresh Market", "shop", 20, "biz_market"),
    place("park", "Ari Park", "park", 40),
    place("school", "Ari Community School", "school", 30, "biz_school"),
    place("hospital", "Sukhumvit Clinic", "hospital", 16, "biz_clinic"),
    place("cafe", "Nightjar Cafe", "workplace", 12, "biz_cafe"),
  ];
  return Object.fromEntries(list.map((p) => [p.id, p]));
}

function place(
  id: string,
  name: string,
  kind: Place["kind"],
  capacity: number,
  employerId?: string,
): Place {
  return { id, name, kind, capacity, occupantIds: [], employerId };
}

function createBusinesses(places: Record<string, Place>): Record<string, Business> {
  const list: Business[] = [
    business("biz_horizon", "Horizon Labs", "software", "office"),
    business("biz_market", "Ari Fresh Market", "retail", "shop"),
    business("biz_school", "Ari Community School", "education", "school"),
    business("biz_clinic", "Sukhumvit Clinic", "healthcare", "hospital"),
    business("biz_cafe", "Nightjar Cafe", "hospitality", "cafe"),
  ];
  for (const b of list) {
    const site = places[b.placeId];
    if (site) site.employerId = b.id;
  }
  return Object.fromEntries(list.map((b) => [b.id, b]));
}

function business(id: string, name: string, industry: Business["industry"], placeId: string): Business {
  return {
    id,
    name,
    industry,
    placeId,
    revenue: 0,
    payroll: 0,
    employeeIds: [],
    hiring: true,
  };
}

function seedHouseholds(
  world: WorldState,
  rng: Rng,
  homes: Place[],
  population: number,
  playerAge: number,
): void {
  const year = world.clock.year;
  const add = (age: number, homeId: string, extra?: { lastName?: string; gender?: "female" | "male" | "nonbinary"; isPlayer?: boolean }) => {
    const id = `p_${world.nextId++}`;
    const person = createPerson(rng, { id, age, year, homeId, ...extra });
    world.people[id] = person;
    return person;
  };

  const homeA = homes[0]?.id ?? "home_a";
  const adult = add(playerAge, homeA, { isPlayer: true });
  adult.career.track = "software";
  adult.career.title = "Developer";
  adult.career.level = 2;
  adult.career.salaryMonthly = 42000;
  adult.career.performance = 64;
  adult.career.experience = 48;
  adult.career.reputation = 44;
  adult.finances.cash = 38000;
  adult.finances.savings = 90450;
  adult.finances.monthlyIncome = 42000;
  adult.finances.rentMonthly = 12000;
  const partnerAge = clampAge(playerAge + rng.int(-3, 4));
  if (playerAge >= 22 && rng.chance(0.7)) {
    const partner = add(partnerAge, homeA, { lastName: adult.lastName });
    pair(adult, partner, rng.chance(0.45) ? "spouse" : "romantic", {
      familiarity: 80,
      trust: 74,
      affection: 78,
      respect: 70,
      attraction: 68,
      conflict: 14,
      dependency: 40,
    });
    adult.familyIds.push(partner.id);
    partner.familyIds.push(adult.id);
    remember(adult, world, {
      type: "relationship",
      text: `You share a home with ${fullName(partner)}.`,
      participantIds: [adult.id, partner.id],
      emotionalImpact: 20,
      importance: 70,
    });
  }
  if (playerAge >= 28 && rng.chance(0.4)) {
    const child = add(rng.int(4, 10), homeA, { lastName: adult.lastName });
    linkFamily(adult, child, world);
  }

  const templates: Array<{ ages: number[]; home: string }> = [
    { ages: [44, 42, 16], home: homes[1]?.id ?? "home_b" },
    { ages: [55], home: homes[2]?.id ?? "home_c" },
    { ages: [23, 24], home: homes[3]?.id ?? "home_d" },
    { ages: [31, 8, 67], home: homes[4]?.id ?? "home_e" },
  ];

  for (const household of templates) {
    const members = household.ages.map((age) => add(age, household.home));
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const a = members[i];
        const b = members[j];
        if (!a || !b) continue;
        const kind = Math.abs(a.ageYears - b.ageYears) > 16 ? "family" : a.ageYears > 20 && b.ageYears > 20 ? "family" : "family";
        pair(a, b, kind, {
          familiarity: 90,
          trust: 80,
          affection: 75,
          respect: 70,
          conflict: rng.float(6, 20),
          dependency: 50,
        });
        a.familyIds.push(b.id);
        b.familyIds.push(a.id);
        if (a.ageYears - b.ageYears >= 16) {
          if (!a.childIds.includes(b.id)) a.childIds.push(b.id);
          if (!b.parentIds.includes(a.id)) b.parentIds.push(a.id);
        }
        if (b.ageYears - a.ageYears >= 16) {
          if (!b.childIds.includes(a.id)) b.childIds.push(a.id);
          if (!a.parentIds.includes(b.id)) a.parentIds.push(b.id);
        }
        remember(a, world, {
          type: "family",
          text: `${fullName(b)} is family.`,
          participantIds: [a.id, b.id],
          emotionalImpact: 16,
          importance: 70,
        });
      }
    }
  }

  let guard = 0;
  while (Object.keys(world.people).length < population && guard < 80) {
    const home = rng.pick(homes);
    add(rng.int(6, 72), home.id);
    guard += 1;
  }
}

function linkFamily(adult: ReturnType<typeof createPerson>, child: ReturnType<typeof createPerson>, world: WorldState): void {
  pair(adult, child, "family", {
    familiarity: 95,
    trust: 88,
    affection: 90,
    respect: 70,
    conflict: 8,
    dependency: 70,
  });
  adult.familyIds.push(child.id);
  child.familyIds.push(adult.id);
  if (!adult.childIds.includes(child.id)) adult.childIds.push(child.id);
  if (!child.parentIds.includes(adult.id)) child.parentIds.push(adult.id);
  remember(adult, world, {
    type: "family",
    text: `${fullName(child)} is your child.`,
    participantIds: [adult.id, child.id],
    emotionalImpact: 30,
    importance: 90,
  });
}

function assignJobs(world: WorldState, rng: Rng): void {
  const employers = Object.values(world.businesses);
  for (const person of Object.values(world.people)) {
    if (!person.alive) continue;
    if (person.ageYears < 18 || person.career.track === "student") {
      person.education.inSchool = person.ageYears >= 6 && person.ageYears < 18;
      person.career.employerId = person.education.inSchool ? "biz_school" : undefined;
      continue;
    }
    if (person.career.track === "retired" || person.career.track === "unemployed") continue;

    const match =
      employers.find((b) => b.industry === person.career.track) ??
      rng.pick(employers);
    person.career.employerId = match.id;
    match.employeeIds.push(person.id);
  }
}

function seedSocialGraph(world: WorldState, rng: Rng): void {
  const people = Object.values(world.people);
  for (const person of people) {
    const colleagues = people.filter(
      (o) => o.id !== person.id && o.career.employerId && o.career.employerId === person.career.employerId,
    );
    for (const other of colleagues) {
      if (!person.relationships[other.id]) {
        pair(person, other, "colleague", {
          familiarity: rng.float(20, 50),
          trust: rng.float(25, 55),
          affection: rng.float(10, 40),
          respect: rng.float(30, 60),
          conflict: rng.float(2, 16),
        });
      }
    }
  }
}

function occupyPlaces(world: WorldState): void {
  for (const place of Object.values(world.places)) place.occupantIds = [];
  for (const person of Object.values(world.people)) {
    if (!person.alive) continue;
    const loc = world.places[person.locationId];
    loc?.occupantIds.push(person.id);
  }
}

function clampAge(n: number): number {
  return Math.max(18, Math.min(80, n));
}

export function workplaceOf(person: { career: { employerId?: string }; education: { inSchool: boolean } }, world: WorldState): Place | undefined {
  if (person.education.inSchool) return world.places.school;
  const employer = person.career.employerId ? world.businesses[person.career.employerId] : undefined;
  return employer ? world.places[employer.placeId] : undefined;
}
