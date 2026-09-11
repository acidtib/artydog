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
      <label
        htmlFor="weapon"
        className="block text-sm font-semibold text-neutral-200"
      >
        Weapon
      </label>
      <select
        id="weapon"
        value={weapon.id}
        onChange={(event) => onWeaponChange(event.target.value)}
        className="mt-2 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
      >
        {WEAPONS.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-neutral-500">
        Range {weapon.range.minM}-{weapon.range.maxM} m
      </p>
    </div>
  );
}
