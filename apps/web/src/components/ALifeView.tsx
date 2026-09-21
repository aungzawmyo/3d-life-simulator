"use client";

import { ALifeEngine, type ALifeSummary, type LifeNode } from "@life/simulation-core";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0, 1, 5, 20, 100] as const;

function colorFor(node: LifeNode): string {
  if (node.state === "dead") return "#4a4038";
  if (node.kind === "seed") return "#d7a45a";
  if (node.morphogenB > 0.55) return "#8eb4d4";
  if (node.morphogenA > 0.65) return "#74c28a";
  return "#9aa88a";
}

function draw(canvas: HTMLCanvasElement, engine: ALifeEngine): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: gw, height: gh, cell, nutrients, signalA, signalB, nodes } = engine.world;
  const worldW = gw * cell;
  const worldH = gh * cell;
  const scaleX = canvas.width / worldW;
  const scaleY = canvas.height / worldH;

  const image = ctx.createImageData(gw, gh);
  for (let i = 0; i < nutrients.length; i += 1) {
    const n = nutrients[i] ?? 0;
    const a = signalA[i] ?? 0;
    const b = signalB[i] ?? 0;
    const o = i * 4;
    image.data[o] = Math.floor(16 + b * 90);
    image.data[o + 1] = Math.floor(20 + n * 140 + a * 40);
    image.data[o + 2] = Math.floor(14 + a * 50);
    image.data[o + 3] = 255;
  }
  const field = document.createElement("canvas");
  field.width = gw;
  field.height = gh;
  field.getContext("2d")?.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(field, 0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 1.2;
  for (const node of Object.values(nodes)) {
    if (!node.parentId) continue;
    const parent = nodes[node.parentId];
    if (!parent) continue;
    ctx.strokeStyle = node.state === "dead" ? "#2a3228" : "#3d5340";
    ctx.beginPath();
    ctx.moveTo(parent.x * scaleX, parent.y * scaleY);
    ctx.lineTo(node.x * scaleX, node.y * scaleY);
    ctx.stroke();
  }

  for (const node of Object.values(nodes)) {
    ctx.fillStyle = colorFor(node);
    ctx.beginPath();
    ctx.arc(node.x * scaleX, node.y * scaleY, Math.max(2.2, node.radius * scaleX * 0.7), 0, Math.PI * 2);
    ctx.fill();
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#181e18] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[#8d9586]">{label}</div>
      <div className="tabular-nums text-sm">{value}</div>
    </div>
  );
}

export function ALifeView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ALifeEngine | null>(null);
  const speedRef = useRef(1);
  const [seed, setSeed] = useState(2026);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [summary, setSummary] = useState<ALifeSummary | null>(null);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const engine = new ALifeEngine({ seed, starters: 16 });
    engineRef.current = engine;
    setSummary(engine.summary());
    let frame = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const current = engineRef.current;
      const canvas = canvasRef.current;
      if (!current || !canvas) {
        frame = requestAnimationFrame(loop);
        return;
      }
      const elapsed = now - last;
      if (speedRef.current > 0 && elapsed >= 1000 / 30) {
        current.step(speedRef.current === 100 ? 8 : speedRef.current === 20 ? 3 : speedRef.current);
        setSummary(current.summary());
        last = now;
      }
      draw(canvas, current);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [seed]);

  return (
    <div className="scan flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2c352b] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="display text-lg tracking-tight">Artificial life</span>
          <Link href="/" className="text-[11px] uppercase tracking-wider text-[#8eb4d4] hover:text-[#e7eadc]">
            Neighborhood
          </Link>
          <span className="text-[#8d9586]">
            L<sub>t+1</sub> = F(L, G, E, N, R)
          </span>
        </div>
        <div className="flex items-center gap-1">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              className={`min-w-12 border px-2 py-1 text-xs uppercase tracking-wider ${
                speed === value
                  ? "border-[#d7a45a] bg-[#d7a45a] text-[#10140f]"
                  : "border-[#2c352b] text-[#8d9586] hover:text-[#e7eadc]"
              }`}
            >
              {value === 0 ? "Pause" : `${value}×`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSeed((n) => n + 1)}
            className="ml-2 border border-[#2c352b] px-2 py-1 text-xs uppercase tracking-wider text-[#8d9586] hover:text-[#e7eadc]"
          >
            New seed
          </button>
        </div>
      </header>

      {summary ? (
        <div className="grid grid-cols-5 gap-px border-b border-[#2c352b] bg-[#2c352b]">
          <Stat label="Tick" value={String(summary.tick)} />
          <Stat label="Living" value={`${summary.living} / ${summary.seeds} seeds`} />
          <Stat label="Energy" value={summary.meanEnergy.toFixed(1)} />
          <Stat label="Born / died" value={`${summary.births} / ${summary.deaths}`} />
          <Stat label="Generations" value={String(summary.generations)} />
        </div>
      ) : null}

      <main className="flex flex-1 flex-col gap-3 p-4">
        <canvas
          ref={canvasRef}
          width={768}
          height={768}
          className="mx-auto aspect-square h-auto max-h-[calc(100vh-11rem)] w-full max-w-[min(100%,calc(100vh-11rem))] border border-[#2c352b] bg-[#10140f]"
        />
        <p className="text-center text-xs text-[#8d9586]">
          LifeNodes grow from energy, local automata, reaction–diffusion, and recursive geometry. Fibonacci only
          schedules growth. The environment selects. Nothing here is drawn as a human.
        </p>
      </main>
    </div>
  );
}
