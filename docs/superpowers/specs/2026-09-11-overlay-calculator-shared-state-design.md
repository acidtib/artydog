# Overlay calculator with shared state

Date: 2026-09-11
Status: approved design, pre-implementation
Covers milestones 6 and 7 from `docs/MILESTONES.md`.

## Context

The main window renders the real calculator (`src/components/Calculator.tsx`)
with all state in local `useState`. The overlay window still renders the
Phase 1 test UI (test input, counter button). Milestone 7 requires both
windows to share one calculator state, and the overlay needs the real
calculator so the user can run fire missions without leaving WARDOGS.

Approved decisions from brainstorming:

- Sync mechanism: Rust-authoritative state with event broadcast, matching
  the existing "Rust is authoritative, frontend mirrors" pattern used for
  overlay visibility.
- Interaction model: auto-calculate in both windows. No Calculate button
  anywhere.
- Overlay contents: weapon select, mortar X/Y, target X/Y, results, plus
  the existing drag bar, resize corner, and hide button.

## Non-goals

- Disk persistence of coordinates (milestone 12 "recent coordinates").
- Presets, copy-result, compact/large mode switching, opacity.
- Any change to the ballistics math in `src/calculator/`.

## State model

```ts
interface CalcState {
  weaponId: string;
  mortarX: string;
  mortarY: string;
  targetX: string;
  targetY: string;
}
```

The shared state holds the raw input strings, nothing derived. Raw text is
lossless: each window derives errors and the solution locally from the pure
calculator module, so a stale solution can never exist and no derived state
is ever synced.

The type lives in `src/calculator/types.ts` (pure, no React or Tauri) and is
imported by the bridge and both windows.

Defaults: all fields empty strings. An empty or unknown `weaponId` resolves
to `DEFAULT_WEAPON_ID` in the frontend derive helper, so Rust never needs to
know weapon ids and cannot drift from `weapons.ts`.

State is session-only, in memory, mirroring how geometry lives in
`AppState` for the process lifetime.

## Rust changes

`src-tauri/src/state.rs`:

- `CalcState` struct: five `String` fields, `Debug`, `Clone`, `PartialEq`,
  `Serialize`, `Deserialize`, `#[serde(rename_all = "camelCase")]`,
  `Default` returning empty strings.
- `AppState` gains `calc: Mutex<CalcState>` initialized to default.

`src-tauri/src/commands.rs`:

- `pub const CALC_STATE_EVENT: &str = "calc-state-changed";` next to its
  only emitter.
- `get_calc_state(state) -> Result<CalcState, String>`: clone from the
  mutex; poisoned lock maps to `Err` like existing commands.
- `set_calc_state(app, state, calc: CalcState) -> Result<CalcState, String>`:
  store the clone, drop the lock, `app.emit(CALC_STATE_EVENT, &calc)`,
  return the clone. Full-state writes only: each write is self-correcting
  because every field carries its complete text, so there are no partial
  patches to order.

`src-tauri/src/lib.rs`: register both commands in `invoke_handler`.

No capability changes; `core:default` already covers the event APIs, as
proven by the existing `overlay-visibility` listener.

## Frontend bridge and hook

`src/lib/calculatorState.ts`, following the `overlay.ts` conventions:

- `CALC_STATE_EVENT` constant with a must-match comment pointing at
  `commands.rs`.
- `getCalcState(): Promise<CalcState>`, `setCalcState(calc): Promise<CalcState>`
  invoke wrappers, `onCalcStateChanged(handler)` listener wrapper.

`src/lib/useCalcState.ts`:

```ts
function useCalcState(): {
  calc: CalcState;
  updateCalc: (next: CalcState) => void;
  error: string | null;
}
```

- Local state starts at all-empty (matches the Rust default, no flash on
  load).
- On mount: fetch via `getCalcState`, subscribe via `onCalcStateChanged`;
  unlisten on unmount. A rejected fetch or listener registration surfaces
  the error. The event echo is the reconciliation path for the other
  window's edits.
- `updateCalc(next)`: sets local state immediately (optimistic, so the
  controlled input never lags a frame behind typing), then invokes
  `setCalcState`. If the invoke rejects, the error surfaces and local state
  stays as typed; Rust holds the last accepted state and the next
  successful write re-syncs the full state.

## Derivation and display rules

New pure helper in `src/calculator/` (named `derive.ts`):

```ts
function deriveCalcView(calc: CalcState): CalcView;
```

`CalcView` carries the resolved `weapon`, per-field `PointErrors` for both
points, and the `Solution | null`. Rules:

- Weapon: `findWeapon(calc.weaponId)`, falling back to `DEFAULT_WEAPON_ID`
  when the id is empty or unknown.
- A field error renders only when that field is non-empty and invalid.
  Empty fields are neutral, so a fresh calculator shows no "Required"
  noise; `parseCoordinate`'s "Required" error is dropped for empty text.
- The solution renders whenever both points parse; `solve()` already
  reports out-of-range as `inRange: false` with empty arcs.

Both windows consume this one helper, so the display rules cannot diverge.

## UI changes

`src/components/WeaponSelect.tsx` (new): the weapon dropdown plus range
hint extracted from today's `Calculator.tsx`. Props: `weapon` (the already
resolved `Weapon`; the select's value is `weapon.id`) and
`onWeaponChange(id)`.

`src/components/Calculator.tsx` (refactor): controlled component, props
`{ calc: CalcState; onChange: (next: CalcState) => void }`. Renders
`WeaponSelect`, both `CoordinateInput`s with errors from `deriveCalcView`,
and `ResultPanel`. The form, submit handler, Calculate button, and the
"solution belongs to its inputs" bookkeeping are deleted: the view is
always derived.

`src/components/OverlayCalculator.tsx` (new): same props as `Calculator`.
Compact layout with tighter spacing and smaller text to fit the 400x300
default geometry, same neutral palette and emerald accents, reusing
`WeaponSelect`, `CoordinateInput`, and `ResultPanel`.

`src/Overlay.tsx` (rewire): owns `useCalcState`, keeps the drag bar,
resize corner, hide button, and a single error line that now reports both
window-command and calc-command failures. The test input and counter
button are deleted.

`src/App.tsx` (rewire): owns `useCalcState`, passes `calc`/`onChange` to
`Calculator`, and renders the calc error line beneath the calculator
(mirroring the overlay's single error line).

## Error handling

- Poisoned mutex maps to `Err(String)` like every existing command.
- Invoke failures from `setCalcState` surface in the calling window's error
  line; state stays optimistic as described above.
- A failed `getCalcState` on mount leaves the all-empty default in place
  and surfaces the error; edits still work because each write carries the
  full state.

## Testing

Pure helper (`derive.test.ts`):

- Empty state: no field errors, null solution.
- Non-empty invalid field: error shown; empty sibling field stays neutral.
- Valid points: solution present with expected distance and azimuth.
- Unknown or empty weapon id resolves to `DEFAULT_WEAPON_ID`.
- Out-of-range distance: solution present with `inRange: false`.

Hook (`useCalcState.test.ts` with the bridge module mocked):

- Mount fetches and mirrors the fetched state.
- Event payload replaces local state.
- `updateCalc` applies locally first, then invokes with the full state.

Components:

- `Calculator.test.tsx` rewritten for the controlled auto-calc behavior:
  typing calls `onChange` with the full next `CalcState`, invalid non-empty
  input shows an error, a fully valid state shows a solution with no
  button click.
- New `OverlayCalculator.test.tsx`: renders weapon, inputs, and results
  from props; typing propagates through `onChange`.

Rust:

- `CalcState` serde round-trip test pinning the camelCase field names (the
  contract the frontend depends on) and the all-empty default.

Manual verification on this machine:

- `WEBKIT_DISABLE_DMABUF_RENDERER=1 pnpm tauri dev`
- Type in the main window; the overlay mirrors every keystroke live, and
  vice versa.
- Weapon switch propagates both directions.
- Alt+M toggle keeps the calculator state.
- Invalid input shows only that field's error and no solution.

## Documentation updates (part of implementation)

- `docs/ARCHITECTURE.md`: describe the calc-state flow (command write,
  event broadcast, local derive).
- `docs/MILESTONES.md`: tick "Calculator state persists while toggling
  overlay" once verified.

## File manifest

Rust: `src-tauri/src/state.rs`, `src-tauri/src/commands.rs`,
`src-tauri/src/lib.rs`.
Frontend: `src/calculator/types.ts` (CalcState), `src/calculator/derive.ts`
(new), `src/lib/calculatorState.ts` (new), `src/lib/useCalcState.ts` (new),
`src/components/WeaponSelect.tsx` (new), `src/components/Calculator.tsx`
(refactor), `src/components/OverlayCalculator.tsx` (new), `src/Overlay.tsx`
(rewire), `src/App.tsx` (rewire), plus the test files above.
