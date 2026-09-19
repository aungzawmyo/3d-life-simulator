import { isNight, isSchoolHours, isWorkHours, lifeStage } from "./clock";
import { workplaceOf } from "./world";
import type { Rng } from "./rng";
import type { Activity, ActivityType, Person, Place, WorldState } from "./types";

interface Option {
  type: ActivityType;
  locationId: string;
  duration: number;
  utility: number;
  targetId?: string;
}

export function chooseActivity(person: Person, world: WorldState, rng: Rng): Activity {
  const clock = world.clock;
  const options: Option[] = [];
  const home = world.places[person.homeId];
  const work = workplaceOf(person, world);
  const shop = world.places.shop;
  const park = world.places.park;
  const hospital = world.places.hospital;
  const cafe = world.places.cafe;

  const add = (
    type: ActivityType,
    location: Place | undefined,
    duration: number,
    utility: number,
    targetId?: string,
  ) => {
    if (!location) return;
    options.push({ type, locationId: location.id, duration, utility, targetId });
  };

  const stage = lifeStage(person.ageYears);
  const mustSleep = person.needs.sleep > 72 || person.needs.energy < 18 || (isNight(clock) && person.needs.sleep > 35);
  add("sleep", home, rng.int(90, 240), mustSleep ? 0.95 : person.needs.sleep / 140 + (isNight(clock) ? 0.35 : 0));

  add(
    "eat",
    person.locationId === person.homeId ? home : shop,
    30,
    person.needs.hunger / 110 + (person.needs.hunger > 70 ? 0.45 : 0),
  );
  add("cook", home, 50, person.needs.hunger / 130 + (person.skills.cooking?.competence ?? 0) / 400);

  if (person.education.inSchool && isSchoolHours(clock) && stage !== "elder") {
    add("study", world.places.school, 60, 0.78 + (1 - person.needs.entertainment / 100) * 0.1);
  }

  if (person.career.employerId && isWorkHours(clock) && person.career.track !== "unemployed" && person.career.track !== "retired") {
    const moneyPressure = person.finances.cash < 4000 ? 0.2 : 0;
    add("work", work, 60, 0.7 + moneyPressure + person.needs.purpose / 400 - person.needs.energy / 400);
  }

  add("shop", shop, 40, (person.needs.hunger > 50 ? 0.25 : 0.08) + (person.finances.cash > 800 ? 0.1 : 0));
  add(
    "recreation",
    rng.chance(0.5) ? park : cafe,
    50,
    person.needs.entertainment / 120 + (100 - person.happiness) / 400,
  );
  add("exercise", park, 40, (100 - person.needs.fitness) / 220 + person.aptitudes.fitness / 400);

  if (person.physicalHealth < 42 || person.hidden.immune < 40) {
    add("hospital", hospital, 80, 0.72);
  }

  const others = Object.values(world.people).filter((o) => o.alive && o.id !== person.id);
  if (others.length > 0 && person.personality.sociability > 35) {
    const other = rng.pick(others);
    const rel = person.relationships[other.id];
    const loneliness = (100 - person.needs.belonging) / 140;
    add("socialize", world.places[other.locationId] ?? park, 45, loneliness + (rel?.affection ?? 10) / 250 + person.personality.sociability / 400, other.id);
  }

  add("idle", home, 20, 0.05);

  options.sort((a, b) => b.utility - a.utility);
  const top = options[0] ?? { type: "idle", locationId: person.homeId, duration: 20, utility: 0 };
  const commute = top.locationId !== person.locationId;
  if (commute) {
    return {
      type: "commute",
      locationId: top.locationId,
      startedAt: clock.totalMinutes,
      durationMinutes: rng.int(8, 18),
      targetId: top.targetId,
    };
  }
  return {
    type: top.type,
    locationId: top.locationId,
    startedAt: clock.totalMinutes,
    durationMinutes: top.duration,
    targetId: top.targetId,
  };
}

export function activityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    idle: "Resting",
    sleep: "Sleeping",
    eat: "Eating",
    cook: "Cooking",
    work: "Working",
    study: "Studying",
    shop: "Shopping",
    socialize: "Socializing",
    recreation: "At leisure",
    exercise: "Exercising",
    commute: "Commuting",
    hospital: "At clinic",
    care: "Caring",
  };
  return labels[type];
}
