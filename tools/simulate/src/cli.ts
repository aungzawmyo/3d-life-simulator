import { ALifeEngine, SimulationEngine, fullName, lifeStage } from "@life/simulation-core";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function runALife(): void {
  const ticks = Number(arg("ticks", "400"));
  const starters = Number(arg("starters", "16"));
  const seed = Number(arg("seed", "2026"));
  const verbose = flag("verbose");
  const engine = new ALifeEngine({ seed, starters });
  const started = Date.now();
  const reportEvery = Math.max(1, Math.floor(ticks / 10));

  for (let i = 0; i < ticks; i += 1) {
    engine.step(1);
    if (verbose && engine.world.tick % reportEvery === 0) {
      const s = engine.summary();
      console.log(
        `tick ${String(s.tick).padStart(5)}  living=${s.living}  seeds=${s.seeds}  energy=${s.meanEnergy.toFixed(1)}  gen=${s.generations}  born=${s.births}  dead=${s.deaths}`,
      );
    }
  }

  const ms = Date.now() - started;
  const summary = engine.summary();
  console.log("\n3d-life-simulator · artificial life");
  console.log("────────────────────────────────────────");
  console.log(`tick         ${summary.tick}`);
  console.log(`living       ${summary.living} (${summary.seeds} seeds)`);
  console.log(`energy       ${summary.meanEnergy.toFixed(1)}`);
  console.log(`health       ${summary.meanHealth.toFixed(1)}`);
  console.log(`branch °     ${summary.meanBranchAngle.toFixed(1)}`);
  console.log(`efficiency   ${summary.meanEfficiency.toFixed(2)}`);
  console.log(`births       ${summary.births}`);
  console.log(`deaths       ${summary.deaths}`);
  console.log(`generations  ${summary.generations}`);
  console.log(`elapsed      ${ms}ms`);
}

if (flag("alife")) {
  runALife();
  process.exit(0);
}

const population = Number(arg("population", "20"));
const days = Number(arg("days", "0"));
const years = Number(arg("years", "0"));
const seed = Number(arg("seed", "2026"));
const step = Number(arg("step", "60"));
const verbose = flag("verbose");

const spanDays = years > 0 ? years * 365 : days > 0 ? days : 30;

const engine = new SimulationEngine({ seed, population });
const started = Date.now();

if (verbose) {
  console.log(`Seed ${seed} · ${Object.keys(engine.world.people).length} people · ${spanDays} days\n`);
}

const reportEvery = Math.max(1, Math.floor(spanDays / 10));
let lastReported = 0;
const totalMinutes = spanDays * 24 * 60;
let elapsed = 0;

while (elapsed < totalMinutes) {
  const slice = Math.min(step, totalMinutes - elapsed);
  engine.tick(slice);
  elapsed += slice;
  const day = Math.floor(elapsed / (24 * 60));
  if (verbose && day >= lastReported + reportEvery) {
    lastReported = day;
    const s = engine.summary(day);
    console.log(
      `day ${String(day).padStart(4)}  living=${s.living}  happy=${s.averageHappiness.toFixed(1)}  health=${s.averageHealth.toFixed(1)}  jobless=${(s.unemployment * 100).toFixed(0)}%  ${engine.clockLabel()}`,
    );
  }
}

const ms = Date.now() - started;
const summary = engine.summary(spanDays);
const player = engine.player;

console.log("\n3d-life-simulator · headless run");
console.log("────────────────────────────────────────");
console.log(`clock        ${engine.clockLabel()}`);
console.log(`people       ${summary.living} living / ${summary.dead} dead`);
console.log(`happiness    ${summary.averageHappiness.toFixed(1)}`);
console.log(`health       ${summary.averageHealth.toFixed(1)}`);
console.log(`unemployment ${(summary.unemployment * 100).toFixed(1)}%`);
console.log(`liquid ฿     ${Math.round(summary.totalCash).toLocaleString()}`);
console.log(`marriages    ${summary.marriages}`);
console.log(`births       ${summary.births}`);
console.log(`homeowners   ${summary.homeowners}`);
console.log(`events       ${summary.events}`);
console.log(`elapsed      ${ms}ms`);

if (player) {
  console.log("\nplayer");
  console.log(`  ${fullName(player)}, ${Math.floor(player.ageYears)} (${lifeStage(player.ageYears)})`);
  console.log(`  ${player.career.title} · ฿${player.finances.cash.toFixed(0)} cash`);
  console.log(`  health ${player.physicalHealth.toFixed(0)}  mood ${player.happiness.toFixed(0)}  stress ${player.stress.toFixed(0)}`);
  console.log(`  now: ${player.activity.type} @ ${engine.world.places[player.locationId]?.name ?? player.locationId}`);
}

const recent = engine.world.timeline.slice(-8);
if (recent.length > 0) {
  console.log("\ntimeline");
  for (const entry of recent) {
    console.log(`  ${entry.year}-${String(entry.month).padStart(2, "0")}-${String(entry.day).padStart(2, "0")}  ${entry.text}`);
  }
}
