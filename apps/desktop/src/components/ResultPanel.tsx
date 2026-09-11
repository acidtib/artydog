import {
  formatAzimuth,
  formatDelta,
  formatDistance,
  formatMil,
} from "../calculator/format";
import type { Solution, Weapon } from "../calculator/types";

interface ResultPanelProps {
  weapon: Weapon;
  solution: Solution | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <span className="font-mono text-lg text-neutral-100">{value}</span>
    </div>
  );
}

export default function ResultPanel({ weapon, solution }: ResultPanelProps) {
  if (solution === null) {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-sm text-neutral-500">
          Enter coordinates and calculate to see a firing solution.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
      <div className="divide-y divide-neutral-800">
        <Row label="Distance" value={formatDistance(solution.distanceMeters)} />
        <Row label="Azimuth" value={formatAzimuth(solution.azimuthDegrees)} />
        {solution.arcs.map((arc) => (
          <Row
            key={arc.arcId}
            label={
              weapon.arcs.length > 1 ? `Elevation ${arc.arcLabel}` : "Elevation"
            }
            value={`${formatMil(arc)} mil`}
          />
        ))}
      </div>

      {!solution.inRange && (
        <p role="status" className="mt-3 text-sm font-semibold text-red-400">
          Out of range for {weapon.label} ({weapon.range.minM}-
          {weapon.range.maxM} m)
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        ΔX {formatDelta(solution.deltaXMeters)} · ΔY{" "}
        {formatDelta(solution.deltaYMeters)} · azimuth 0° north, 90° east
      </p>
    </div>
  );
}
