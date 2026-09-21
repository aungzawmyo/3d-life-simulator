# 3D Life Simulator

A systems-driven life simulation. Under the neighborhood is an artificial-life substrate: energy, matter, local cell rules, recursive growth, and selection. The human block sits on top of that foundation. The 3D view is a presentation layer — the world can run without drawing a single polygon.

Repository: [aungzawmyo/3d-life-simulator](https://github.com/aungzawmyo/3d-life-simulator)

## Design principle

Not “a 3D game where you control a human.”

A simulated neighborhood where people sleep, eat, work, earn, spend, meet, remember, and change — and the world continues after they are gone.

## Stack (Phase 1)

| Layer | Choice |
|---|---|
| Simulation | TypeScript `packages/simulation-core` — **zero Three.js** |
| Headless runner | `tools/simulate` |
| Presentation | Next.js + React Three Fiber + Tailwind |
| Later | NestJS API, PostgreSQL, Redis — only when persistence needs it |

## First playable slice

One Bangkok block (Ari): apartments, office, market, park, school, clinic, cafe. Twenty autonomous residents. Thirty simulated days.

Happiness is an **output** of health, bonds, money, purpose, and stress — not a bar you click.

Playable life systems now include education, jobs, marriage, children, housing, data-driven events, save/load, death, and **legacy continuation**.

## Commands

```bash
pnpm install

# Headless neighborhood, 30 days
pnpm simulate -- --population 20 --days 30 --verbose

# Long run (hourly ticks)
pnpm simulate -- --population 40 --years 5 --step 60 --verbose

# Artificial-life substrate (no humans)
pnpm simulate -- --alife --ticks 400 --starters 16 --verbose

# Tests
pnpm test

# Dashboard + isometric block
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the neighborhood, or [http://localhost:3000/alife](http://localhost:3000/alife) for the LifeNode field. Pause / 1× / 5× / 20× / 100×.

## Architecture boundary

```text
apps/web          3D + dashboard (reads state)
tools/simulate    CLI
packages/simulation-core
  alife/          LifeNode, genome-as-program, CA, RD, growth
  clock, person, needs, career, economy,
  relationships, memory, events, utility AI, engine
```

`simulation-core` must stay render-free. If a system needs a mesh, it does not belong there.

## Artificial-life rules

Life is not a Fibonacci law. Fibonacci and the golden angle only schedule developmental geometry. The update is:

```text
L(t+1) = F(L, genome, environment, neighbors, randomness)
```

`F` combines cellular automata, reaction–diffusion, recursive branching, energy accounting, mutation, and probabilistic death. Selection is whatever still has energy enough to copy its genome. Humans are a later layer on this substrate, not the foundation.

## Roadmap

1. Headless prototype — **this repo**
2. Small 3D block — **this repo**
3. Education, marriage, children, housing, death, legacy
4. Richer NPC planning (GOAP + schedules)
5. City economy and labor market
6. Generations and inheritance
7. Optional LLM dialogue (never the simulation itself)

## License

MIT
