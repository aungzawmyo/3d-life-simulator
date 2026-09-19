import type { WorldState } from "./types";

export function snapshotWorld(world: WorldState): WorldState {
  return JSON.parse(JSON.stringify(world)) as WorldState;
}

export function serializeWorld(world: WorldState): string {
  return JSON.stringify(world);
}

export function deserializeWorld(json: string): WorldState {
  return JSON.parse(json) as WorldState;
}
