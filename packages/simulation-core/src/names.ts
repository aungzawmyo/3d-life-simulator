import type { Gender } from "./types";
import type { Rng } from "./rng";

const FIRST_FEMALE = [
  "Anna", "Mai", "Ploy", "Sofia", "Narin", "Lina", "Aria", "Kamon", "Elena", "Dao",
];
const FIRST_MALE = [
  "Alex", "Chai", "Daniel", "Krit", "Leo", "Niran", "Omar", "Pong", "Ryan", "Tawan",
];
const FIRST_NB = ["Ash", "Kit", "Noa", "Quin", "Sky"];
const LAST = [
  "Srisuk", "Tanaka", "Rahman", "Chen", "Silva", "Okello", "Berg", "Navarro", "Wattana", "Brooks",
];

export function randomName(rng: Rng, gender: Gender): { firstName: string; lastName: string } {
  const pool =
    gender === "female" ? FIRST_FEMALE : gender === "male" ? FIRST_MALE : FIRST_NB;
  return { firstName: rng.pick(pool), lastName: rng.pick(LAST) };
}

export function displayName(first: string, last: string): string {
  return `${first} ${last}`;
}
