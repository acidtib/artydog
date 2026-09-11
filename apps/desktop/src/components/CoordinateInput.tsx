import type { PointErrors } from "../calculator/validation";

export interface PointText {
  x: string;
  y: string;
}

interface CoordinateInputProps {
  legend: string;
  idPrefix: string;
  value: PointText;
  errors: PointErrors;
  onChange: (axis: keyof PointText, value: string) => void;
}

const AXES: readonly (keyof PointText)[] = ["x", "y"];

export default function CoordinateInput({
  legend,
  idPrefix,
  value,
  errors,
  onChange,
}: CoordinateInputProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-neutral-200">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {AXES.map((axis) => {
          const id = `${idPrefix}-${axis}`;
          const error = errors[axis];

          return (
            <div key={axis} className="min-w-0">
              <label
                htmlFor={id}
                className="block text-xs uppercase tracking-wide text-neutral-400"
              >
                {axis}
              </label>
              <input
                id={id}
                // type="number" discards invalid text before validation sees it.
                type="text"
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                value={value[axis]}
                onChange={(event) => onChange(axis, event.target.value)}
                aria-invalid={error !== undefined}
                aria-describedby={error === undefined ? undefined : `${id}-error`}
                className={`mt-1 w-full rounded border bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-emerald-500 ${
                  error === undefined ? "border-neutral-700" : "border-red-500"
                }`}
              />
              {error !== undefined && (
                <p id={`${id}-error`} className="mt-1 text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
