import catalog from "./data/events.json";
import { clamp } from "./math";
import { recordEvent } from "./events";
import type { Rng } from "./rng";
import type { Person, WorldState } from "./types";

interface JsonEvent {
  id: string;
  text: string;
  probability: number;
  minAge?: number;
  maxAge?: number;
  inSchool?: boolean;
  effects: Record<string, number>;
}

export function rollJsonEvents(world: WorldState, rng: Rng): void {
  for (const person of Object.values(world.people)) {
    if (!person.alive) continue;
    for (const def of catalog as unknown as JsonEvent[]) {
      if (def.minAge !== undefined && person.ageYears < def.minAge) continue;
      if (def.maxAge !== undefined && person.ageYears > def.maxAge) continue;
      if (def.inSchool && !person.education.inSchool) continue;
      if (!rng.chance(def.probability)) continue;
      applyEffects(person, def.effects);
      recordEvent(world, def.id, def.text.replace("{name}", person.firstName), def.effects, person.id);
    }
  }
}

function applyEffects(person: Person, effects: Record<string, number>): void {
  if (effects.cash) person.finances.cash += effects.cash;
  if (effects.stress) person.stress = clamp(person.stress + effects.stress);
  if (effects.confidence) person.needs.confidence = clamp(person.needs.confidence + effects.confidence);
  if (effects.belonging) person.needs.belonging = clamp(person.needs.belonging + effects.belonging);
  if (effects.entertainment) person.needs.entertainment = clamp(person.needs.entertainment + effects.entertainment);
}
