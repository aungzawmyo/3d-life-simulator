import { clamp, ema, satiate } from "./math";
import { financialSecurity, relationshipSatisfaction } from "./person";
import type { Person } from "./types";

/**
 * Happiness is an output, never a button. Weighted moving average with
 * diminishing returns so no single domain can max the life.
 */
export function recomputeHappiness(person: Person): number {
  const bonds = satiate(relationshipSatisfaction(person), 40);
  const health = satiate(person.physicalHealth, 38);
  const mind = satiate(person.mentalWellbeing, 40);
  const money = satiate(financialSecurity(person), 42);
  const purpose = satiate(person.needs.purpose, 40);
  const play = satiate(100 - person.needs.entertainment, 50);
  const belonging = satiate(person.needs.belonging, 45);

  const stress = satiate(person.stress, 35);
  const lonely = satiate(100 - belonging * 100, 40);
  const illness = satiate(100 - person.physicalHealth, 30);

  const personality =
    (person.personality.emotionalStability - 50) * 0.08 +
    (person.personality.sociability - 50) * 0.03;

  const raw =
    18 +
    (bonds * 0.2 +
      health * 0.16 +
      purpose * 0.14 +
      money * 0.13 +
      play * 0.1 +
      mind * 0.12 +
      belonging * 0.09) *
      100 +
    personality -
    stress * 14 -
    lonely * 8 -
    illness * 10;

  person.happiness = clamp(ema(person.happiness, raw, 0.14));
  return person.happiness;
}
