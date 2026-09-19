import type { Person, WorldState } from "@life/simulation-core";

export function money(world: WorldState, n: number): string {
  return `${world.country.currencySymbol}${Math.round(n).toLocaleString()}`;
}

export function barColor(kind: "health" | "energy" | "stress" | "mood"): string {
  if (kind === "health") return "var(--health)";
  if (kind === "energy") return "var(--energy)";
  if (kind === "stress") return "var(--stress)";
  return "var(--accent)";
}

export function activityTone(type: string): string {
  switch (type) {
    case "sleep":
      return "#6b7ea8";
    case "work":
    case "study":
      return "#d7a45a";
    case "eat":
    case "cook":
      return "#c9846a";
    case "socialize":
      return "#c07aa8";
    case "exercise":
    case "recreation":
      return "#74c28a";
    case "hospital":
      return "#d36b56";
    case "shop":
      return "#8eb4d4";
    default:
      return "#9aa392";
  }
}

export function initials(person: Person): string {
  return `${person.firstName[0] ?? "?"}${person.lastName[0] ?? ""}`;
}
