import { clamp } from "./math";
import type { Rng } from "./rng";
import type { Person, Relationship, RelationshipKind } from "./types";

export function bind(
  a: Person,
  b: Person,
  kind: RelationshipKind,
  seed?: Partial<Relationship>,
): void {
  a.relationships[b.id] = {
    familiarity: seed?.familiarity ?? 20,
    trust: seed?.trust ?? 35,
    attraction: seed?.attraction ?? 10,
    respect: seed?.respect ?? 40,
    affection: seed?.affection ?? 25,
    conflict: seed?.conflict ?? 8,
    dependency: seed?.dependency ?? 10,
    ...seed,
    otherId: b.id,
    kind: seed?.kind ?? kind,
  };
}

export function pair(
  a: Person,
  b: Person,
  kind: RelationshipKind,
  seed?: Partial<Relationship>,
): void {
  bind(a, b, kind, seed);
  bind(b, a, kind, seed);
}

export function quality(rel: Relationship): number {
  return clamp(
    rel.affection * 0.28 +
      rel.trust * 0.26 +
      rel.respect * 0.18 +
      rel.familiarity * 0.12 -
      rel.conflict * 0.34,
  );
}

export function driftDaily(person: Person): void {
  for (const rel of Object.values(person.relationships)) {
    rel.familiarity = clamp(rel.familiarity - 0.08);
    rel.conflict = clamp(rel.conflict - 0.12);
    if (rel.kind === "stranger" || rel.kind === "acquaintance") {
      rel.affection = clamp(rel.affection - 0.04);
    }
  }
}

export function interact(
  a: Person,
  b: Person,
  rng: Rng,
  intensity = 1,
): void {
  const rel = a.relationships[b.id] ?? bindDefault(a, b);
  const other = b.relationships[a.id] ?? bindDefault(b, a);
  const warmth = (a.personality.empathy + b.personality.empathy + a.personality.sociability) / 300;
  const clash = rng.chance(0.12 + a.stress / 400);

  rel.familiarity = clamp(rel.familiarity + 4 * intensity);
  other.familiarity = clamp(other.familiarity + 4 * intensity);

  if (clash) {
    rel.conflict = clamp(rel.conflict + rng.float(4, 12) * intensity);
    other.conflict = clamp(other.conflict + rng.float(3, 10) * intensity);
    rel.trust = clamp(rel.trust - 2);
    return;
  }

  rel.affection = clamp(rel.affection + (2.4 + warmth * 6) * intensity);
  rel.trust = clamp(rel.trust + 1.6 * intensity);
  rel.respect = clamp(rel.respect + 1.1 * intensity);
  other.affection = clamp(other.affection + (2.1 + warmth * 5) * intensity);
  other.trust = clamp(other.trust + 1.4 * intensity);

  if (rel.kind === "stranger" && rel.familiarity > 25) rel.kind = "acquaintance";
  if (rel.kind === "acquaintance" && rel.affection > 45) rel.kind = "friend";
  if (other.kind === "stranger" && other.familiarity > 25) other.kind = "acquaintance";
  if (other.kind === "acquaintance" && other.affection > 45) other.kind = "friend";
}

function bindDefault(a: Person, b: Person): Relationship {
  bind(a, b, "stranger", { familiarity: 5, trust: 20, affection: 8, respect: 20, conflict: 4 });
  return a.relationships[b.id] as Relationship;
}

export function maybeRomance(a: Person, b: Person, rng: Rng): boolean {
  if (a.id === b.id || !a.alive || !b.alive) return false;
  if (a.ageYears < 18 || b.ageYears < 18) return false;
  const rel = a.relationships[b.id];
  if (!rel || rel.kind === "family" || rel.kind === "spouse") return false;
  const attraction = (a.appearance.attractiveness + b.appearance.attractiveness) / 2;
  const ready = rel.affection > 55 && rel.trust > 45 && attraction > 40;
  if (ready && rng.chance(0.08)) {
    rel.kind = "romantic";
    rel.attraction = clamp(rel.attraction + 20);
    const other = b.relationships[a.id];
    if (other) {
      other.kind = "romantic";
      other.attraction = clamp(other.attraction + 18);
    }
    return true;
  }
  return false;
}
