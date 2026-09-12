import {
  compassPoint,
  formatAzimuth,
  formatDelta,
  formatDistance,
  formatMil,
} from "../calculator/format";
import type { CalcStatus } from "../calculator/derive";
import type { Solution, Weapon } from "../calculator/types";

interface ResultPanelProps {
  weapon: Weapon;
  solution: Solution | null;
  status: CalcStatus;
  className?: string;
}

type Tone = "idle" | "ok" | "warn" | "bad";

interface Entry {
  label: string;
  value: string;
  /// Trails the value a size down, so it reads as a note on the number
  /// rather than part of it.
  suffix?: string;
  muted?: boolean;
}

function arcLabel(weapon: Weapon, label: string): string {
  return weapon.arcs.length > 1 ? `Elevation ${label}` : "Elevation";
}

/// A weapon in range whose other arc cannot reach says so here, so a missing
/// elevation row reads as the table's limit rather than a bug.
function arcNote(weapon: Weapon, solution: Solution): string {
  if (weapon.arcs.length < 2 || solution.arcs.length !== 1) {
    return "";
  }
  return ` · ${solution.arcs[0].arcLabel.toLowerCase()} arc only`;
}

function describe(
  weapon: Weapon,
  status: CalcStatus,
  solution: Solution | null,
): { tone: Tone; text: string } {
  switch (status.kind) {
    case "awaiting":
      return {
        tone: "idle",
        text:
          status.missing === "both"
            ? "Awaiting coordinates"
            : status.missing === "target"
              ? "Awaiting target"
              : "Awaiting artillery position",
      };
    case "invalid":
      return { tone: "warn", text: "Check the coordinates" };
    case "inRange":
      return {
        tone: "ok",
        text: `In range${solution === null ? "" : arcNote(weapon, solution)}`,
      };
    case "tooClose":
      return {
        tone: "bad",
        text: `Too close by ${Math.round(status.byMeters)} m · min ${weapon.range.minM} m`,
      };
    case "tooFar":
      return {
        tone: "bad",
        text: `Too far by ${Math.round(status.byMeters)} m · max ${weapon.range.maxM} m`,
      };
  }
}

const TONE_TEXT: Record<Tone, string> = {
  idle: "text-neutral-500",
  ok: "text-neutral-400",
  warn: "border-amber-500/20 bg-amber-500/[0.07] text-amber-400",
  bad: "border-red-500/20 bg-red-500/[0.07] text-red-400",
};

function placeholders(weapon: Weapon): Entry[] {
  return [
    { label: "Distance", value: "-", muted: true },
    { label: "Azimuth", value: "-", muted: true },
    ...weapon.arcs.map((arc) => ({
      label: arcLabel(weapon, arc.label),
      value: "-",
      muted: true,
    })),
  ];
}

function entries(weapon: Weapon, solution: Solution): Entry[] {
  return [
    { label: "Distance", value: formatDistance(solution.distanceMeters) },
    {
      label: "Azimuth",
      value: formatAzimuth(solution.azimuthDegrees),
      suffix: compassPoint(solution.azimuthDegrees),
    },
    // Unsolved arcs keep their row so the rows below never shift.
    ...weapon.arcs.map((arc) => {
      const solved = solution.arcs.find((entry) => entry.arcId === arc.id);
      const label = arcLabel(weapon, arc.label);

      return solved === undefined
        ? { label, value: "-", muted: true }
        : { label, value: `${formatMil(solved)} mil` };
    }),
  ];
}

const PAD = "px-5";

export default function ResultPanel({
  weapon,
  solution,
  status,
  className = "",
}: ResultPanelProps) {
  const waiting = solution === null;
  const rows = waiting ? placeholders(weapon) : entries(weapon, solution);
  const { tone, text } = describe(weapon, status, solution);

  return (
    <div
      className={`flex flex-1 flex-col border-t border-tool-hairline ${className}`}
    >
      {/* One strip for all three states, so filling in a solution shifts nothing. */}
      <p
        role="status"
        className={`border-b border-tool-hairline py-2 text-right text-[11px] font-semibold uppercase tracking-wider ${PAD} ${TONE_TEXT[tone]}`}
      >
        {text}
      </p>

      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center justify-between gap-3 border-b border-tool-hairline py-3 ${PAD}`}
        >
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            {row.label}
          </span>
          <span
            className={`truncate font-mono text-[26px] font-bold leading-none tabular-nums ${
              row.muted === true ? "text-neutral-600" : "text-emerald-400"
            }`}
          >
            {row.value}
            {row.suffix !== undefined && (
              <span className="ml-1.5 text-[15px] font-medium text-emerald-400/60">
                {row.suffix}
              </span>
            )}
          </span>
        </div>
      ))}

      <div className="flex-1" />

      <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-t border-tool-hairline bg-black/20 px-4">
        <span className="truncate font-mono text-[11px] text-neutral-500">
          {waiting
            ? "ΔX - · ΔY -"
            : `ΔX ${formatDelta(solution.deltaXMeters)} · ΔY ${formatDelta(solution.deltaYMeters)}`}
        </span>
        <span className="shrink-0 text-[10px] text-neutral-600">0° N, 90° E</span>
      </div>
    </div>
  );
}
