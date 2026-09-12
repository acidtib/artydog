import { useState } from "react";
import {
  compassPoint,
  deriveCalcView,
  formatAzimuth,
  formatDelta,
  formatDistance,
  formatMil,
  WEAPONS,
  type CalcState,
  type CalcStatus,
  type Solution,
  type Weapon,
} from "../lib/ballistics";

/// A working replica of the app's main window. Class names mirror the desktop
/// components (apps/desktop/src/components) so the landing page shows the real
/// thing; only the load-in animation is page-only.

/// What a coordinate can look like while it is still being typed.
const PARTIAL_NUMBER = /^[+-]?(\d+\.?\d*)?$/;

const INITIAL: CalcState = {
  weaponId: "",
  artilleryX: "",
  artilleryY: "",
  targetX: "",
  targetY: "",
};

type Tone = "idle" | "ok" | "warn" | "bad";

const TONE_TEXT: Record<Tone, string> = {
  idle: "text-neutral-500",
  ok: "text-neutral-400",
  warn: "border-amber-500/20 bg-amber-500/[0.07] text-amber-400",
  bad: "border-red-500/20 bg-red-500/[0.07] text-red-400",
};

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
    case "inRange": {
      // A two-arc weapon whose other arc cannot reach says so here.
      const note =
        weapon.arcs.length >= 2 && solution?.arcs.length === 1
          ? ` · ${solution.arcs[0].arcLabel.toLowerCase()} arc only`
          : "";

      return { tone: "ok", text: `In range${note}` };
    }
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

function ResultRow({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | null;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-tool-hairline px-5 py-3">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
      {value === null ? (
        <span className="font-mono text-[26px] font-bold leading-none tabular-nums text-neutral-600">
          -
        </span>
      ) : (
        <span className={`text-right font-mono text-[26px] font-bold leading-none tabular-nums text-emerald-400 demo-in`}>
          {value}
          {suffix !== undefined && (
            <span className="ml-1.5 text-[15px] font-medium text-emerald-400/60">
              {suffix}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export default function DemoCalculator({ version }: { version: string }) {
  const [calc, setCalc] = useState<CalcState>(INITIAL);
  const view = deriveCalcView(calc);
  const { tone, text } = describe(view.weapon, view.status, view.solution);
  const solution = view.solution;

  const edit =
    (point: "artillery" | "target", axis: "x" | "y") => (value: string) => {
      if (!PARTIAL_NUMBER.test(value)) {
        return;
      }
      const key =
        point === "artillery"
          ? axis === "x"
            ? "artilleryX"
            : "artilleryY"
          : axis === "x"
            ? "targetX"
            : "targetY";
      setCalc((current) => ({ ...current, [key]: value }));
    };

  return (
    <div className="demo-in w-full max-w-[382px] overflow-hidden rounded-[6px] border border-tool-hairline bg-tool-base shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)]">
      {/* Title bar, as the undecorated window renders it. */}
      <div className="flex h-[30px] items-center border-b border-tool-hairline bg-tool-raised pl-3 select-none">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-300">
          ArtyDog
        </span>
        <div className="ml-auto flex h-full items-stretch text-neutral-500">
          <span aria-hidden="true" className="flex w-10 items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <span aria-hidden="true" className="flex w-10 items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <div
            role="radiogroup"
            aria-label="Weapon"
            className="flex gap-0.5 rounded-[4px] bg-tool-control p-0.5"
          >
            {WEAPONS.map((weapon) => {
              const isActive = weapon.id === view.weapon.id;

              return (
                <button
                  key={weapon.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() =>
                    setCalc((current) => ({ ...current, weaponId: weapon.id }))
                  }
                  className={`min-w-0 flex-1 cursor-pointer truncate rounded-[3px] px-2 py-2 text-sm font-medium sm:py-1 sm:text-xs transition-colors ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                  }`}
                >
                  {weapon.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 px-0.5 font-mono text-[11px] leading-none text-neutral-500">
            RNG {view.weapon.range.minM}-{view.weapon.range.maxM} m
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { legend: "Artillery", prefix: "artillery", point: "artillery" as const, errors: view.artilleryErrors },
              { legend: "Target", prefix: "target", point: "target" as const, errors: view.targetErrors },
            ] as const
          ).map((group) => (
            <fieldset key={group.legend} className="min-w-0">
              <legend className="float-left px-0.5 text-[10px] font-bold uppercase leading-4 tracking-wider text-neutral-400">
                {group.legend}
              </legend>
              <button
                type="button"
                aria-label={`Clear ${group.prefix}`}
                title={`Clear ${group.prefix}`}
                disabled={
                  group.point === "artillery"
                    ? calc.artilleryX === "" && calc.artilleryY === ""
                    : calc.targetX === "" && calc.targetY === ""
                }
                onClick={() => {
                  setCalc((current) =>
                    group.point === "artillery"
                      ? { ...current, artilleryX: "", artilleryY: "" }
                      : { ...current, targetX: "", targetY: "" },
                  );
                  document.getElementById(`demo-${group.prefix}-x`)?.focus();
                }}
                className="float-right -my-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:invisible sm:my-0 sm:h-4 sm:w-4"
              >
                <svg aria-hidden="true" width="8" height="8" viewBox="0 0 10 10">
                  <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
              <div className="clear-both flex gap-1.5 pt-1.5">
                {(["x", "y"] as const).map((axis) => {
                  const id = `demo-${group.prefix}-${axis}`;
                  const value =
                    group.point === "artillery"
                      ? axis === "x"
                        ? calc.artilleryX
                        : calc.artilleryY
                      : axis === "x"
                        ? calc.targetX
                        : calc.targetY;
                  const error = group.errors[axis];

                  return (
                    <div key={axis} className="min-w-0 flex-1">
                      <div className="relative">
                        <label
                          htmlFor={id}
                          className="pointer-events-none absolute inset-y-0 left-2 flex items-center font-mono text-[9px] font-bold uppercase text-neutral-500"
                        >
                          {axis}
                        </label>
                        <input
                          id={id}
                          aria-label={`${group.legend} ${axis.toUpperCase()}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.0"
                          autoComplete="off"
                          spellCheck={false}
                          value={value}
                          onChange={(event) =>
                            edit(group.point, axis)(event.target.value)
                          }
                          aria-invalid={error !== undefined}
                          className={`h-9 w-full rounded-[4px] border bg-tool-input pl-5 pr-1.5 font-mono text-base text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-emerald-500 sm:h-7 sm:text-[13px] ${
                            error === undefined
                              ? "border-tool-border"
                              : "border-red-500"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="flex flex-col border-t border-tool-hairline">
        <p
          role="status"
          className={`border-b border-tool-hairline py-2 pr-5 text-right text-[11px] font-semibold uppercase tracking-wider ${TONE_TEXT[tone]}`}
        >
          {text}
        </p>

        <ResultRow
          label="Distance"
          value={
            solution === null ? null : formatDistance(solution.distanceMeters)
          }
        />
        <ResultRow
          label="Azimuth"
          value={
            solution === null ? null : formatAzimuth(solution.azimuthDegrees)
          }
          suffix={
            solution === null ? undefined : compassPoint(solution.azimuthDegrees)
          }
        />
        {view.weapon.arcs.map((arc) => {
          const solved =
            solution?.arcs.find((entry) => entry.arcId === arc.id) ?? null;

          return (
            <ResultRow
              key={arc.id}
              label={
                view.weapon.arcs.length > 1
                  ? `Elevation ${arc.label}`
                  : "Elevation"
              }              value={solved === null ? null : `${formatMil(solved)} mil`}
            />
          );
        })}

        <div className="mt-auto flex h-8 items-center justify-between gap-2 border-t border-tool-hairline bg-black/20 px-4">
          <span className="truncate whitespace-nowrap font-mono text-[11px] text-neutral-500">
            {solution === null
              ? "ΔX - · ΔY -"
              : `ΔX ${formatDelta(solution.deltaXMeters)} · ΔY ${formatDelta(solution.deltaYMeters)}`}
          </span>
          <span className="shrink-0 text-[10px] text-neutral-600">
            0° N, 90° E
          </span>
        </div>
      </div>

      <div className="flex h-[33px] items-center justify-between border-t border-tool-hairline px-3 pb-px">
        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center text-neutral-500">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </span>
        <span className="font-mono text-[11px] text-neutral-600">
          v{version}
        </span>
      </div>
    </div>
  );
}
