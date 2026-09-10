import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SyntheticEvent,
  type SetStateAction,
} from "react";
import { solve } from "../calculator/solution";
import type { Solution } from "../calculator/types";
import { parsePoint, type PointErrors } from "../calculator/validation";
import { DEFAULT_WEAPON_ID, findWeapon, WEAPONS } from "../calculator/weapons";
import CoordinateInput, { type PointText } from "./CoordinateInput";
import ResultPanel from "./ResultPanel";

const EMPTY_POINT: PointText = { x: "", y: "" };

export default function Calculator() {
  const [weaponId, setWeaponId] = useState(DEFAULT_WEAPON_ID);
  const [mortar, setMortar] = useState<PointText>(EMPTY_POINT);
  const [target, setTarget] = useState<PointText>(EMPTY_POINT);
  const [mortarErrors, setMortarErrors] = useState<PointErrors>({});
  const [targetErrors, setTargetErrors] = useState<PointErrors>({});
  const [solution, setSolution] = useState<Solution | null>(null);

  const weapon = useMemo(
    () => findWeapon(weaponId) ?? WEAPONS[0],
    [weaponId],
  );

  // A solution belongs to the inputs it came from, so any edit drops it. The
  // other axis keeps its error, which is still true until it is edited too.
  const editPoint = useCallback(
    (
      setPoint: Dispatch<SetStateAction<PointText>>,
      setErrors: Dispatch<SetStateAction<PointErrors>>,
    ) =>
      (axis: keyof PointText, value: string) => {
        setPoint((previous) => ({ ...previous, [axis]: value }));
        setErrors((previous) => {
          if (previous[axis] === undefined) {
            return previous;
          }

          const next = { ...previous };
          delete next[axis];

          return next;
        });
        setSolution(null);
      },
    [],
  );

  const onSubmit = useCallback(
    (event: SyntheticEvent) => {
      event.preventDefault();

      const parsedMortar = parsePoint(mortar.x, mortar.y);
      const parsedTarget = parsePoint(target.x, target.y);

      setMortarErrors(parsedMortar.ok ? {} : parsedMortar.errors);
      setTargetErrors(parsedTarget.ok ? {} : parsedTarget.errors);

      if (!parsedMortar.ok || !parsedTarget.ok) {
        setSolution(null);
        return;
      }

      setSolution(solve(weapon, parsedMortar.value, parsedTarget.value));
    },
    [mortar, target, weapon],
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="weapon"
          className="block text-sm font-semibold text-neutral-200"
        >
          Weapon
        </label>
        <select
          id="weapon"
          value={weaponId}
          onChange={(event) => {
            setWeaponId(event.target.value);
            setSolution(null);
          }}
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

      <CoordinateInput
        legend="Mortar"
        idPrefix="mortar"
        value={mortar}
        errors={mortarErrors}
        onChange={editPoint(setMortar, setMortarErrors)}
      />

      <CoordinateInput
        legend="Target"
        idPrefix="target"
        value={target}
        errors={targetErrors}
        onChange={editPoint(setTarget, setTargetErrors)}
      />

      <button
        type="submit"
        className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        Calculate
      </button>

      <ResultPanel weapon={weapon} solution={solution} />
    </form>
  );
}
