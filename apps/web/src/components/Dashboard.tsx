"use client";

import {
  WEEKDAYS,
  activityLabel,
  financialSecurity,
  fullName,
  lifeStage,
  relationshipQuality,
  relationshipSatisfaction,
  type Person,
  type SimSpeed,
} from "@life/simulation-core";
import { useState } from "react";
import { useSimLoop } from "@/hooks/useSimLoop";
import { activityTone, initials, money } from "@/lib/format";
import { useSim } from "@/store/sim";
import { Meter } from "./Meter";
import { WorldScene } from "./WorldScene";

const SPEEDS: SimSpeed[] = [0, 1, 5, 20, 100];
const PANELS = ["health", "career", "finance", "social", "family", "skills", "memories", "actions"] as const;
type Panel = (typeof PANELS)[number];

export function Dashboard() {
  useSimLoop();
  const world = useSim((s) => s.world);
  const frame = useSim((s) => s.frame);
  const selectedId = useSim((s) => s.selectedId);
  const select = useSim((s) => s.select);
  const setSpeed = useSim((s) => s.setSpeed);
  const reset = useSim((s) => s.reset);
  const save = useSim((s) => s.save);
  const load = useSim((s) => s.load);
  const continueAs = useSim((s) => s.continueAs);
  const message = useSim((s) => s.message);
  const [panel, setPanel] = useState<Panel>("health");
  const person = world.people[selectedId];
  const living = Object.values(world.people).filter((p) => p.alive);
  void frame;

  return (
    <div className="scan flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2c352b] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="display text-lg tracking-tight">Ari, {world.city.name}</span>
          <span className="text-[#8d9586]">
            {person ? `${Math.floor(person.ageYears)} yrs` : "—"} · {WEEKDAYS[world.clock.weekday]} ·{" "}
            {String(world.clock.hour).padStart(2, "0")}:{String(world.clock.minute).padStart(2, "0")}
          </span>
          <span className="text-[#d7a45a] tabular-nums">
            {person ? money(world, person.finances.cash + person.finances.savings) : ""}
          </span>
          {world.economy.recession ? (
            <span className="rounded-sm border border-[#d36b56]/40 px-2 py-0.5 text-[11px] uppercase tracking-wider text-[#d36b56]">
              Recession
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setSpeed(speed)}
              className={`min-w-12 border px-2 py-1 text-xs uppercase tracking-wider ${
                world.clock.speed === speed
                  ? "border-[#d7a45a] bg-[#d7a45a] text-[#10140f]"
                  : "border-[#2c352b] text-[#8d9586] hover:text-[#e7eadc]"
              }`}
            >
              {speed === 0 ? "Pause" : `${speed}×`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => reset()}
            className="ml-2 border border-[#2c352b] px-2 py-1 text-xs uppercase tracking-wider text-[#8d9586] hover:text-[#e7eadc]"
          >
            New seed
          </button>
          <button type="button" onClick={() => save()} className="border border-[#2c352b] px-2 py-1 text-xs uppercase tracking-wider text-[#8d9586] hover:text-[#e7eadc]">
            Save
          </button>
          <button type="button" onClick={() => load()} className="border border-[#2c352b] px-2 py-1 text-xs uppercase tracking-wider text-[#8d9586] hover:text-[#e7eadc]">
            Load
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="border-b border-[#2c352b] lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible">
            {PANELS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className={`px-3 py-2 text-left text-sm capitalize ${
                  panel === id ? "bg-[#1f261f] text-[#e7eadc]" : "text-[#8d9586] hover:text-[#e7eadc]"
                }`}
              >
                {id}
              </button>
            ))}
          </nav>
          <div className="hidden max-h-[48vh] overflow-auto border-t border-[#2c352b] px-3 py-3 lg:block">
            <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#8d9586]">Residents</p>
            <ul className="space-y-1">
              {living.map((resident) => (
                <li key={resident.id}>
                  <button
                    type="button"
                    onClick={() => select(resident.id)}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${
                      resident.id === selectedId ? "bg-[#1f261f]" : "hover:bg-[#1f261f]/60"
                    }`}
                  >
                    <span
                      className="grid h-6 w-6 place-items-center text-[10px]"
                      style={{ background: activityTone(resident.activity.type) }}
                    >
                      {initials(resident)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{resident.firstName}</span>
                    <span className="text-[10px] uppercase text-[#8d9586]">{resident.activity.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="grid grid-rows-[1fr_auto] gap-3 p-3">
          <WorldScene />
          {person ? <PersonDetail person={person} panel={panel} /> : null}
        </main>

        <aside className="space-y-5 border-t border-[#2c352b] p-4 lg:border-l lg:border-t-0">
          {person ? (
            <>
              <div>
                <p className="display text-2xl leading-none">{person.firstName}</p>
                <p className="mt-1 text-sm text-[#8d9586]">
                  {fullName(person)} · {lifeStage(person.ageYears).replace("_", " ")}
                </p>
                <p className="mt-2 text-sm text-[#d7a45a]">{person.career.title}</p>
              </div>
              <Meter label="Health" value={person.physicalHealth} kind="health" />
              <Meter label="Energy" value={person.needs.energy} kind="energy" />
              <Meter label="Stress" value={person.stress} kind="stress" />
              <Meter label="Happiness" value={person.happiness} kind="mood" />
              <div className="border-t border-[#2c352b] pt-4 text-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#8d9586]">Current task</p>
                <p className="mt-1">{activityLabel(person.activity.type)}</p>
                <p className="text-[#8d9586]">{world.places[person.locationId]?.name}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#8d9586]">No one selected.</p>
          )}
        </aside>
      </div>

      {world.pendingLegacy ? (
        <div className="border-t border-[#d7a45a]/40 bg-[#1f261f] px-4 py-3">
          <p className="display text-xl">{world.pendingLegacy.deceasedName} died</p>
          <p className="mt-1 text-sm text-[#8d9586]">{world.pendingLegacy.cause} · the world continues</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {world.pendingLegacy.heirIds.map((id) => {
              const heir = world.people[id];
              if (!heir) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => continueAs(id)}
                  className="border border-[#d7a45a] px-3 py-1 text-sm text-[#d7a45a]"
                >
                  Continue as {heir.firstName}
                </button>
              );
            })}
            {world.pendingLegacy.heirIds.length === 0 ? (
              <p className="text-sm text-[#8d9586]">No descendant remains. Start a new seed.</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {message ? <p className="px-4 pt-2 text-xs text-[#d7a45a]">{message}</p> : null}

      <footer className="border-t border-[#2c352b] px-4 py-3">
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#8d9586]">Life timeline</p>
        <div className="flex gap-4 overflow-x-auto text-sm">
          {world.timeline.slice(-12).map((entry) => (
            <div key={entry.id} className="min-w-48 shrink-0">
              <p className="text-[11px] text-[#8d9586]">
                {entry.year}-{String(entry.month).padStart(2, "0")}-{String(entry.day).padStart(2, "0")}
              </p>
              <p>{entry.text}</p>
            </div>
          ))}
          {world.timeline.length === 0 ? (
            <p className="text-[#8d9586]">No landmark events yet. Let a few days pass.</p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function PersonDetail({ person, panel }: { person: Person; panel: Panel }) {
  const world = useSim((s) => s.world);

  if (panel === "health") {
    return (
      <section className="grid gap-3 border border-[#2c352b] bg-[#181e18] p-4 md:grid-cols-3">
        <Stat label="Physical" value={person.physicalHealth} />
        <Stat label="Mental" value={person.mentalWellbeing} />
        <Stat label="Sleep debt" value={person.hidden.sleepDebt} hint="hidden" />
        <Stat label="Nutrition" value={person.hidden.nutrition} hint="hidden" />
        <Stat label="Cardiovascular" value={person.hidden.cardiovascular} hint="hidden" />
        <Stat label="Biological age" value={person.biologicalAge} digits={1} />
      </section>
    );
  }

  if (panel === "career") {
    return (
      <section className="grid gap-3 border border-[#2c352b] bg-[#181e18] p-4 md:grid-cols-3">
        <Stat label="Title" text={person.career.title} />
        <Stat label="Performance" value={person.career.performance} />
        <Stat label="Experience" value={person.career.experience} />
        <Stat label="Salary" text={money(world, person.career.salaryMonthly) + " / mo"} />
        <Stat label="Education" text={person.education.level + (person.education.inSchool ? " · enrolled" : "")} />
        <Stat label="Purpose" value={person.needs.purpose} />
        <Stat label="Reputation" value={person.career.reputation} />
      </section>
    );
  }

  if (panel === "finance") {
    return (
      <section className="grid gap-3 border border-[#2c352b] bg-[#181e18] p-4 md:grid-cols-3">
        <Stat label="Cash" text={money(world, person.finances.cash)} />
        <Stat label="Savings" text={money(world, person.finances.savings)} />
        <Stat label="Debt" text={money(world, person.finances.debt)} />
        <Stat label="Rent" text={money(world, person.finances.rentMonthly)} />
        <Stat label="Home" text={person.ownsHome ? `Owned · ฿${Math.round(person.homeValue).toLocaleString()}` : "Renting"} />
        <Stat label="Security" value={financialSecurity(person)} />
        <Stat label="Unemployment" text={`${(world.economy.unemployment * 100).toFixed(0)}% city`} />
      </section>
    );
  }

  if (panel === "social") {
    const rels = Object.values(person.relationships)
      .map((rel) => ({ rel, other: world.people[rel.otherId] }))
      .filter((row) => row.other)
      .sort((a, b) => relationshipQuality(b.rel) - relationshipQuality(a.rel))
      .slice(0, 6);
    return (
      <section className="border border-[#2c352b] bg-[#181e18] p-4">
        <p className="mb-3 text-sm text-[#8d9586]">
          Bond quality {relationshipSatisfaction(person).toFixed(0)} · happiness is an output of these ties
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {rels.map(({ rel, other }) => (
            <div key={rel.otherId} className="border border-[#2c352b] p-3">
              <p className="text-sm">
                {other?.firstName} <span className="text-[#8d9586]">{rel.kind}</span>
              </p>
              <Tiny label="Affection" value={rel.affection} />
              <Tiny label="Trust" value={rel.trust} />
              <Tiny label="Attraction" value={rel.attraction} />
              <Tiny label="Conflict" value={rel.conflict} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (panel === "family") {
    const kin = person.familyIds.map((id) => world.people[id]).filter((p): p is Person => Boolean(p));
    return (
      <section className="grid gap-3 border border-[#2c352b] bg-[#181e18] p-4 md:grid-cols-3">
        <Stat label="Generation" text={`${person.generation}`} />
        <Stat label="Parents" text={person.parentIds.length ? String(person.parentIds.length) : "—"} />
        <Stat label="Children" text={String(person.childIds.length)} />
        {kin.slice(0, 6).map((member) => (
          <Stat
            key={member.id}
            label={member.alive ? fullName(member) : `${member.firstName} · deceased`}
            text={person.relationships[member.id]?.kind ?? "family"}
          />
        ))}
        {person.goals.map((goal) => (
          <Stat key={goal.id} label={goal.kind} value={goal.progress} />
        ))}
      </section>
    );
  }

  if (panel === "actions") {
    const actor = Object.values(world.people).find((p) => p.isPlayer);
    const mine = actor?.id === person.id;
    const actions = useSim.getState().engine.actions(person);
    const act = useSim.getState().act;
    return (
      <section className="border border-[#2c352b] bg-[#181e18] p-4">
        <p className="mb-3 text-sm text-[#8d9586]">
          {mine ? "These change the state model, not a single number." : "Inspecting another life. Actions apply to the player."}
        </p>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.id + (action.targetId ?? "")}
              type="button"
              onClick={() => act(action.id, action.targetId)}
              className="border border-[#2c352b] px-3 py-2 text-left text-sm hover:border-[#d7a45a]"
            >
              <span className="block">{action.label}</span>
              <span className="block text-[11px] text-[#8d9586]">{action.detail}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (panel === "skills") {
    const skills = Object.values(person.skills).sort((a, b) => b.competence - a.competence).slice(0, 8);
    return (
      <section className="grid gap-3 border border-[#2c352b] bg-[#181e18] p-4 md:grid-cols-4">
        {skills.map((skill) => (
          <Stat key={skill.id} label={skill.id} value={skill.competence} />
        ))}
      </section>
    );
  }

  return (
    <section className="border border-[#2c352b] bg-[#181e18] p-4">
      <ul className="space-y-2 text-sm">
        {person.memories.slice(0, 8).map((memory) => (
          <li key={memory.id} className="border-b border-[#2c352b] pb-2">
            <p>{memory.text}</p>
            <p className="text-[11px] uppercase tracking-wider text-[#8d9586]">
              {memory.type} · impact {memory.emotionalImpact > 0 ? "+" : ""}
              {memory.emotionalImpact}
            </p>
          </li>
        ))}
        {person.memories.length === 0 ? <li className="text-[#8d9586]">No memories formed yet.</li> : null}
      </ul>
    </section>
  );
}

function Stat({
  label,
  value,
  text,
  hint,
  digits = 0,
}: {
  label: string;
  value?: number;
  text?: string;
  hint?: string;
  digits?: number;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#8d9586]">
        {label}
        {hint ? ` · ${hint}` : ""}
      </p>
      <p className="mt-1 text-lg tabular-nums">
        {text ?? (value === undefined ? "—" : value.toFixed(digits))}
      </p>
    </div>
  );
}

function Tiny({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-1 flex items-center gap-2 text-[11px]">
      <span className="w-16 text-[#8d9586]">{label}</span>
      <div className="h-1 flex-1 bg-[#2c352b]">
        <div className="h-full bg-[#d7a45a]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
