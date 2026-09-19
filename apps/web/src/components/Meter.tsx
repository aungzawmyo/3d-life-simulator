import { barColor } from "@/lib/format";

export function Meter({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "health" | "energy" | "stress" | "mood";
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em] text-[#8d9586]">
        <span>{label}</span>
        <span className="tabular-nums text-[#e7eadc]">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden bg-[#2c352b]">
        <div className="h-full transition-[width] duration-300" style={{ width: `${width}%`, background: barColor(kind) }} />
      </div>
    </div>
  );
}
