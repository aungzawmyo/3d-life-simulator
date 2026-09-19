"use client";

import { useEffect } from "react";
import { useSim } from "@/store/sim";

export function useSimLoop(): void {
  const speed = useSim((s) => s.world.clock.speed);
  const advance = useSim((s) => s.advance);

  useEffect(() => {
    if (speed === 0) return;
    let acc = 0;
    let last = performance.now();
    let lastUi = last;
    let frame = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      acc += dt * speed;
      if (acc >= 1 && now - lastUi >= 80) {
        const minutes = Math.min(180, Math.floor(acc));
        acc -= minutes;
        lastUi = now;
        advance(minutes);
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [speed, advance]);
}
