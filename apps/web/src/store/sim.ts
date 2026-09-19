"use client";

import { SimulationEngine, type Person, type SimSpeed, type WorldState } from "@life/simulation-core";
import { create } from "zustand";

const SAVE_KEY = "life-sim-save";

interface SimStore {
  engine: SimulationEngine;
  world: WorldState;
  selectedId: string;
  frame: number;
  seed: number;
  message: string;
  setSpeed: (speed: SimSpeed) => void;
  select: (id: string) => void;
  advance: (minutes: number) => void;
  reset: (seed?: number) => void;
  act: (actionId: string, targetId?: string) => void;
  continueAs: (heirId: string) => void;
  save: () => void;
  load: () => void;
  selected: () => Person | undefined;
}

function boot(seed: number): SimulationEngine {
  return new SimulationEngine({ seed, population: 20, playerAge: 27 });
}

function snapshot(engine: SimulationEngine, extra: Partial<SimStore> = {}): Partial<SimStore> {
  return {
    engine,
    world: engine.world,
    selectedId: engine.player?.id ?? "",
    frame: 0,
    ...extra,
  };
}

export const useSim = create<SimStore>((set, get) => {
  const engine = boot(2026);
  const player = engine.player;
  return {
    engine,
    world: engine.world,
    selectedId: player?.id ?? "",
    frame: 0,
    seed: 2026,
    message: "",
    setSpeed: (speed) => {
      get().engine.setSpeed(speed);
      set({ world: get().engine.world, frame: get().frame + 1 });
    },
    select: (id) => set({ selectedId: id }),
    advance: (minutes) => {
      get().engine.tick(minutes);
      const next = get().engine.player;
      set({
        world: get().engine.world,
        frame: get().frame + 1,
        selectedId: next?.id ?? get().selectedId,
      });
    },
    reset: (seed = Date.now() % 100000) => {
      const next = boot(seed);
      set({
        ...snapshot(next),
        seed,
        message: `New world · seed ${seed}`,
      });
    },
    act: (actionId, targetId) => {
      const actor = get().engine.player;
      const ok = get().engine.act(actionId, targetId, actor);
      set({
        world: get().engine.world,
        frame: get().frame + 1,
        message: ok ? `Did: ${actionId.replace("_", " ")}` : "That action is not available.",
        selectedId: get().engine.player?.id ?? get().selectedId,
      });
    },
    continueAs: (heirId) => {
      const heir = get().engine.continueAs(heirId);
      set({
        world: get().engine.world,
        frame: get().frame + 1,
        selectedId: heir?.id ?? get().selectedId,
        message: heir ? `${heir.firstName} continues the line.` : "No heir.",
      });
    },
    save: () => {
      localStorage.setItem(SAVE_KEY, get().engine.save());
      set({ message: "World saved in this browser." });
    },
    load: () => {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        set({ message: "No save found." });
        return;
      }
      const next = SimulationEngine.load(raw);
      set({
        ...snapshot(next, { seed: next.world.seed, frame: get().frame + 1 }),
        message: "Save loaded.",
      });
    },
    selected: () => get().world.people[get().selectedId],
  };
});
