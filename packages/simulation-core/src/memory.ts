import type { Memory, Person, WorldState } from "./types";

export function remember(
  person: Person,
  world: WorldState,
  input: {
    type: string;
    text: string;
    participantIds?: string[];
    emotionalImpact: number;
    importance: number;
    decayRate?: number;
  },
): Memory {
  const memory: Memory = {
    id: `m_${world.nextId++}`,
    type: input.type,
    text: input.text,
    participantIds: input.participantIds ?? [person.id],
    timestamp: world.clock.totalMinutes,
    emotionalImpact: input.emotionalImpact,
    importance: input.importance,
    decayRate: input.decayRate ?? 0.004,
  };
  person.memories.unshift(memory);
  if (person.memories.length > 40) person.memories.length = 40;
  return memory;
}

export function decayMemories(person: Person): void {
  person.memories = person.memories
    .map((m) => ({
      ...m,
      importance: Math.max(0, m.importance - m.decayRate * 100),
    }))
    .filter((m) => m.importance > 4);
}

export function memoryBias(person: Person, otherId: string): number {
  return person.memories
    .filter((m) => m.participantIds.includes(otherId))
    .reduce((sum, m) => sum + (m.emotionalImpact * m.importance) / 100, 0);
}
