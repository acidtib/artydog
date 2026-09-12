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
  onClear: () => void;
}

const AXES: readonly (keyof PointText)[] = ["x", "y"];

/// A number mid-typing: empty, a lone sign, or a trailing point after a digit.
const PARTIAL_NUMBER = /^[+-]?(\d+\.?\d*)?$/;

export default function CoordinateInput({
  legend,
  idPrefix,
  value,
  errors,
  onChange,
  onClear,
}: CoordinateInputProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="float-left px-0.5 text-[10px] font-bold uppercase leading-4 tracking-wider text-neutral-400">
        {legend}
      </legend>
      <button
        type="button"
        aria-label={`Clear ${legend.toLowerCase()}`}
        title={`Clear ${legend.toLowerCase()}`}
        disabled={value.x === "" && value.y === ""}
        onClick={() => {
          onClear();
          document.getElementById(`${idPrefix}-x`)?.focus();
        }}
        className="float-right flex h-4 w-4 cursor-pointer items-center justify-center rounded-[3px] text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:invisible"
      >
        <svg aria-hidden="true" width="8" height="8" viewBox="0 0 10 10">
          <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <div className="clear-both flex gap-1.5 pt-1.5">
        {AXES.map((axis) => {
          const id = `${idPrefix}-${axis}`;
          const error = errors[axis];

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
                  // type="number" discards invalid text before validation sees it.
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0"
                  autoComplete="off"
                  spellCheck={false}
                  value={value[axis]}
                  onChange={(event) => {
                    const next = event.target.value;

                    if (PARTIAL_NUMBER.test(next)) {
                      onChange(axis, next);
                    }
                  }}
                  aria-invalid={error !== undefined}
                  aria-describedby={error === undefined ? undefined : `${id}-error`}
                  className={`h-7 w-full rounded-[4px] border bg-tool-input pl-5 pr-1.5 font-mono text-[13px] text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-emerald-500 ${
                    error === undefined ? "border-tool-border" : "border-red-500"
                  }`}
                />
              </div>
              {error !== undefined && (
                <p id={`${id}-error`} className="mt-1 text-[11px] leading-tight text-red-400">
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
