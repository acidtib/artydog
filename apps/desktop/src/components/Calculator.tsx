import { useCallback } from "react";
import { deriveCalcView, editCalcPoint } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import CoordinateInput from "./CoordinateInput";
import ResultPanel from "./ResultPanel";
import WeaponSelect from "./WeaponSelect";

interface CalculatorProps {
  calc: CalcState;
  onChange: (next: CalcState) => void;
}

type PointName = "artillery" | "target";
type Axis = "x" | "y";

export default function Calculator({ calc, onChange }: CalculatorProps) {
  const view = deriveCalcView(calc);

  const editPoint = useCallback(
    (point: PointName) => (axis: Axis, value: string) => {
      onChange(editCalcPoint(calc, point, axis, value));
    },
    [calc, onChange],
  );

  const clearPoint = useCallback(
    (point: PointName) => () => {
      onChange(
        editCalcPoint(editCalcPoint(calc, point, "x", ""), point, "y", ""),
      );
    },
    [calc, onChange],
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 p-4">
        <WeaponSelect
          weapon={view.weapon}
          onWeaponChange={(id) => onChange({ ...calc, weaponId: id })}
        />

        <div className="grid grid-cols-2 gap-3">
          <CoordinateInput
            legend="Artillery"
            idPrefix="artillery"
            value={{ x: calc.artilleryX, y: calc.artilleryY }}
            errors={view.artilleryErrors}
            onChange={editPoint("artillery")}
            onClear={clearPoint("artillery")}
          />

          <CoordinateInput
            legend="Target"
            idPrefix="target"
            value={{ x: calc.targetX, y: calc.targetY }}
            errors={view.targetErrors}
            onChange={editPoint("target")}
            onClear={clearPoint("target")}
          />
        </div>
      </div>

      <ResultPanel
        weapon={view.weapon}
        solution={view.solution}
        status={view.status}
      />
    </div>
  );
}
