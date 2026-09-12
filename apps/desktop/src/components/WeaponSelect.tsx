import type { Weapon } from "../calculator/types";
import { WEAPONS } from "../calculator/weapons";

interface WeaponSelectProps {
  weapon: Weapon;
  onWeaponChange: (id: string) => void;
}

export default function WeaponSelect({
  weapon,
  onWeaponChange,
}: WeaponSelectProps) {
  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Weapon"
        className="flex gap-0.5 rounded-[4px] bg-tool-control p-0.5"
      >
        {WEAPONS.map((candidate) => {
          const isActive = candidate.id === weapon.id;

          return (
            <button
              key={candidate.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onWeaponChange(candidate.id)}
              className={`min-w-0 flex-1 truncate rounded-[3px] px-2 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
              }`}
            >
              {candidate.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 px-0.5 font-mono text-[11px] leading-none text-neutral-500">
        RNG {weapon.range.minM}-{weapon.range.maxM} m
      </p>
    </div>
  );
}
