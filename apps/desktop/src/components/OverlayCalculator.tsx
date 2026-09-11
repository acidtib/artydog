import { useCallback } from "react";
import { deriveCalcView, editCalcPoint } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import CoordinateInput from "./CoordinateInput";
import ResultPanel from "./ResultPanel";
import WeaponSelect from "./WeaponSelect";

interface OverlayCalculatorProps {
  calc: CalcState;
  onChange: (next: CalcState) => void;
}

type PointName = "mortar" | "target";
type Axis = "x" | "y";

export default function OverlayCalculator({
  calc,
  onChange,
}: OverlayCalculatorProps) {
  const view = deriveCalcView(calc);

  const editPoint = useCallback(
    (point: PointName) => (axis: Axis, value: string) => {
      onChange(editCalcPoint(calc, point, axis, value));
    },
    [calc, onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <WeaponSelect
        weapon={view.weapon}
        onWeaponChange={(id) => onChange({ ...calc, weaponId: id })}
      />

      <CoordinateInput
        legend="Mortar"
        idPrefix="mortar"
        value={{ x: calc.mortarX, y: calc.mortarY }}
        errors={view.mortarErrors}
        onChange={editPoint("mortar")}
      />

      <CoordinateInput
        legend="Target"
        idPrefix="target"
        value={{ x: calc.targetX, y: calc.targetY }}
        errors={view.targetErrors}
        onChange={editPoint("target")}
      />

      <ResultPanel weapon={view.weapon} solution={view.solution} />
    </div>
  );
}
