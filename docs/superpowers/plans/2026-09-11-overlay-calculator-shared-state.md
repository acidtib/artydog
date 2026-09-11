# Overlay Calculator Shared State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the real mortar calculator in the overlay window and share one calculator state between the main window and the overlay, with live auto-calculation in both.

**Architecture:** Raw input strings live in a Rust-side `CalcState` behind a Mutex in `AppState` (Rust authoritative, frontend mirrors). A `set_calc_state` command stores the state and broadcasts a `calc-state-changed` event to every window. Each window derives validation errors and the firing solution locally from the pure calculator module, so nothing derived is ever synced. This mirrors the existing overlay-visibility pattern (`OVERLAY_VISIBILITY_EVENT` plus typed wrappers in `src/lib/overlay.ts`).

**Tech Stack:** Tauri 2 (Rust backend), React 19 + TypeScript + Tailwind 4 frontend, Vitest + @testing-library/react, cargo test.

**Spec:** `docs/superpowers/specs/2026-09-11-overlay-calculator-shared-state-design.md`

## Global Constraints

- Repo rules from `AGENTS.md` apply to every task: no em dashes anywhere (code, comments, commit messages, docs); comments only for non-obvious constraints, one clause; commit messages follow Scoped Commits (`<scope>: <lowercase imperative description>`).
- `src/calculator/` must stay free of React and Tauri imports (pure TypeScript).
- Frontend tests: Vitest with jsdom, setup at `apps/desktop/src/test/setup.ts`. Test style: bare `it(...)` from vitest, `afterEach(cleanup)` in component tests, `vi.mock` of `@tauri-apps/api/core` and `@tauri-apps/api/event` for bridge tests (see `src/lib/overlay.test.ts`).
- Commands run from the workspace root. Frontend single-app test run: `pnpm --filter @artydog/desktop test`. Rust: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` (if it fails about missing `dist/`, run `pnpm build` first).
- Unless a path starts with `apps/`, paths in this plan are relative to `apps/desktop/`.
- Every task ends green: its tests pass plus `pnpm lint` clean before committing.

## File Structure

Rust (`apps/desktop/src-tauri/src/`):
- `state.rs` - `CalcState` struct plus the new `AppState.calc` field; overlay default height bump.
- `commands.rs` - `CALC_STATE_EVENT`, `get_calc_state`, `set_calc_state`.
- `lib.rs` - register the two new commands.

Frontend (`apps/desktop/src/`):
- `calculator/types.ts` - `CalcState` interface (pure data shape).
- `calculator/derive.ts` (new) - `emptyCalcState`, `deriveCalcView`, `editCalcPoint`. Pure derivations from `CalcState`.
- `calculator/derive.test.ts` (new) - unit tests for the above.
- `lib/calculatorState.ts` (new) - typed invoke wrappers plus event listener (the bridge).
- `lib/calculatorState.test.ts` (new) - bridge tests.
- `lib/useCalcState.ts` (new) - React hook: fetch on mount, mirror on event, optimistic update.
- `lib/useCalcState.test.ts` (new) - hook tests against a mocked bridge.
- `components/WeaponSelect.tsx` (new) - weapon dropdown plus range hint, extracted from Calculator.
- `components/Calculator.tsx` - refactored to a controlled auto-calculating component.
- `components/Calculator.test.tsx` - rewritten for the new behavior.
- `components/OverlayCalculator.tsx` (new) - compact calculator for the overlay.
- `components/OverlayCalculator.test.tsx` (new).
- `components/ResultPanel.tsx` - null-state copy fix ("calculate" wording is stale once the button is gone).
- `App.tsx` - owns the hook, renders Calculator plus a calc error line.
- `Overlay.tsx` - owns the hook, renders OverlayCalculator, keeps drag bar, resize corner, hide button, error line.

Config:
- `apps/desktop/src-tauri/tauri.conf.json` - overlay window default height 300 to 520.

Docs:
- `docs/ARCHITECTURE.md` - calc state flow section.
- `docs/MILESTONES.md` - tick "Calculator state persists while toggling overlay".

---

### Task 1: CalcState in Rust

**Files:**
- Modify: `apps/desktop/src-tauri/src/state.rs`
- Test: same file, `#[cfg(test)] mod tests`

**Interfaces:**
- Consumes: nothing new.
- Produces: `pub struct CalcState { pub weapon_id: String, pub mortar_x: String, pub mortar_y: String, pub target_x: String, pub target_y: String }` with `Debug, Clone, PartialEq, Serialize, Deserialize`, `#[serde(rename_all = "camelCase")]`, and `Default` (all fields empty strings). Produces `AppState.calc: Mutex<CalcState>` initialized to default in `AppState::new()`.

- [ ] **Step 1: Write the failing tests**

In `state.rs`, add these tests at the end of the existing `mod tests` (after the `centered_in_uses_the_monitor_origin` test). Add `use serde_json;` is not needed: refer to it as `serde_json::...` inline, the crate is already a dependency.

```rust
    #[test]
    fn calc_state_default_is_all_empty() {
        let calc = CalcState::default();
        assert_eq!(calc.weapon_id, "");
        assert_eq!(calc.mortar_x, "");
        assert_eq!(calc.mortar_y, "");
        assert_eq!(calc.target_x, "");
        assert_eq!(calc.target_y, "");
    }

    #[test]
    fn calc_state_serializes_camel_case_for_the_frontend_contract() {
        let calc = CalcState {
            weapon_id: "mortar".to_string(),
            mortar_x: "50".to_string(),
            mortar_y: "50".to_string(),
            target_x: "53".to_string(),
            target_y: "54".to_string(),
        };

        let json = serde_json::to_string(&calc).unwrap();
        assert_eq!(
            json,
            r#"{"weaponId":"mortar","mortarX":"50","mortarY":"50","targetX":"53","targetY":"54"}"#
        );

        let back: CalcState = serde_json::from_str(&json).unwrap();
        assert_eq!(back, calc);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml calc_state`
Expected: compile error, `CalcState` not found.

- [ ] **Step 3: Implement CalcState and wire it into AppState**

In `state.rs`, above `pub struct AppState`, add:

```rust
/// Raw calculator inputs shared by both windows. Text, not parsed values:
/// each window derives errors and the solution locally, so nothing
/// derived has to be kept in sync.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalcState {
    pub weapon_id: String,
    pub mortar_x: String,
    pub mortar_y: String,
    pub target_x: String,
    pub target_y: String,
}

impl Default for CalcState {
    fn default() -> Self {
        Self {
            weapon_id: String::new(),
            mortar_x: String::new(),
            mortar_y: String::new(),
            target_x: String::new(),
            target_y: String::new(),
        }
    }
}
```

Then extend `AppState` and its constructor:

```rust
pub struct AppState {
    pub geometry: Mutex<Option<OverlayGeometry>>,
    /// The shortcut the user configured, registered or not.
    pub hotkey: Mutex<String>,
    pub hotkey_error: Mutex<Option<String>>,
    pub calc: Mutex<CalcState>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            geometry: Mutex::new(None),
            hotkey: Mutex::new(DEFAULT_HOTKEY.to_string()),
            hotkey_error: Mutex::new(None),
            calc: Mutex::new(CalcState::default()),
        }
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
Expected: all tests pass, including the two new ones. The existing suite must stay green.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src-tauri/src/state.rs
git commit -m "state: add CalcState shared by both windows"
```

---

### Task 2: calc state commands and event

This is glue code (thin wrappers over the mutex plus an emit); it has no unit-testable logic without a Tauri app harness, and the repo has no command tests either. The serde contract from Task 1 pins the wire format; correctness is exercised by the hook tests (Task 5) and the live app (Task 8).

**Files:**
- Modify: `apps/desktop/src-tauri/src/commands.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs` (invoke_handler list)

**Interfaces:**
- Consumes: `crate::state::{AppState, CalcState}` from Task 1.
- Produces: `pub const CALC_STATE_EVENT: &str = "calc-state-changed";`, Tauri commands `get_calc_state(state: State<AppState>) -> Result<CalcState, String>` and `set_calc_state(app: AppHandle, state: State<AppState>, calc: CalcState) -> Result<CalcState, String>`.

- [ ] **Step 1: Add the commands**

In `commands.rs`, change the `tauri` import to include `Emitter` and extend the `state` import:

```rust
use tauri::{AppHandle, Emitter, State};
```

```rust
use crate::state::{AppState, CalcState, HotkeyStatus, OverlayGeometry, OverlayStatus};
```

At the end of the file, add:

```rust
/// Mirrored by `CALC_STATE_EVENT` in `src/lib/calculatorState.ts`.
pub const CALC_STATE_EVENT: &str = "calc-state-changed";

#[tauri::command]
pub fn get_calc_state(state: State<'_, AppState>) -> Result<CalcState, String> {
    state
        .calc
        .lock()
        .map_err(|e| format!("calc state lock poisoned: {e}"))
        .map(|guard| guard.clone())
}

#[tauri::command]
pub fn set_calc_state(
    app: AppHandle,
    state: State<'_, AppState>,
    calc: CalcState,
) -> Result<CalcState, String> {
    *state
        .calc
        .lock()
        .map_err(|e| format!("calc state lock poisoned: {e}"))? = calc.clone();
    // Best-effort broadcast, same policy as the visibility event.
    if let Err(e) = app.emit(CALC_STATE_EVENT, &calc) {
        eprintln!("[calc] failed to emit calc state event: {e}");
    }
    Ok(calc)
}
```

- [ ] **Step 2: Register the commands**

In `lib.rs`, extend the `generate_handler!` list:

```rust
        .invoke_handler(tauri::generate_handler![
            commands::show_overlay,
            commands::hide_overlay,
            commands::toggle_overlay,
            commands::get_overlay_state,
            commands::get_overlay_geometry,
            commands::set_overlay_position,
            commands::set_overlay_size,
            commands::reset_overlay_geometry,
            commands::get_hotkey_status,
            commands::set_hotkey,
            commands::get_calc_state,
            commands::set_calc_state,
        ])
```

- [ ] **Step 3: Verify the backend compiles and tests pass**

Run: `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
Expected: pass, no warnings introduced (run `cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml 2>&1 | grep warning` to confirm zero new warnings).

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/commands.rs apps/desktop/src-tauri/src/lib.rs
git commit -m "commands: expose get_calc_state and set_calc_state with change event"
```

---

### Task 3: CalcState type and pure derivations

**Files:**
- Modify: `apps/desktop/src/calculator/types.ts`
- Create: `apps/desktop/src/calculator/derive.ts`
- Test: `apps/desktop/src/calculator/derive.test.ts`

**Interfaces:**
- Consumes: existing `solve` (`src/calculator/solution.ts`), `parsePoint`/`PointErrors` (`src/calculator/validation.ts`), `WEAPONS`/`DEFAULT_WEAPON_ID`/`findWeapon` (`src/calculator/weapons.ts`).
- Produces (used by Tasks 4, 5, 6, 7):
  - `interface CalcState { weaponId: string; mortarX: string; mortarY: string; targetX: string; targetY: string }` in `types.ts`
  - `emptyCalcState(): CalcState`
  - `interface CalcView { weapon: Weapon; mortarErrors: PointErrors; targetErrors: PointErrors; solution: Solution | null }`
  - `deriveCalcView(calc: CalcState): CalcView`
  - `editCalcPoint(calc: CalcState, point: "mortar" | "target", axis: "x" | "y", value: string): CalcState`

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/calculator/derive.test.ts`:

```ts
import { expect, it } from "vitest";
import { DEFAULT_WEAPON_ID } from "./weapons";
import {
  deriveCalcView,
  editCalcPoint,
  emptyCalcState,
} from "./derive";
import type { CalcState } from "./types";

function calc(overrides: Partial<CalcState>): CalcState {
  return { ...emptyCalcState(), ...overrides };
}

it("treats a fresh state as neutral: default weapon, no errors, no solution", () => {
  const view = deriveCalcView(emptyCalcState());

  expect(view.weapon.id).toBe(DEFAULT_WEAPON_ID);
  expect(view.mortarErrors).toEqual({});
  expect(view.targetErrors).toEqual({});
  expect(view.solution).toBeNull();
});

it("falls back to the default weapon for an unknown id", () => {
  const view = deriveCalcView(calc({ weaponId: "nope" }));

  expect(view.weapon.id).toBe(DEFAULT_WEAPON_ID);
});

it("errors only on non-empty invalid fields, never on empty ones", () => {
  const view = deriveCalcView(
    calc({ mortarX: "abc", targetX: "53", targetY: "54" }),
  );

  expect(view.mortarErrors).toEqual({ x: "Must be a number" });
  expect(view.targetErrors).toEqual({});
  expect(view.solution).toBeNull();
});

it("solves the reference vector when both points parse", () => {
  const view = deriveCalcView(
    calc({ mortarX: "50", mortarY: "50", targetX: "53", targetY: "54" }),
  );

  expect(view.solution).not.toBeNull();
  expect(view.solution!.distanceMeters).toBe(500);
  expect(view.solution!.azimuthDegrees).toBeCloseTo(36.9, 1);
  expect(view.solution!.inRange).toBe(true);
});

it("keeps a solution that is out of range, flagged with empty arcs", () => {
  const view = deriveCalcView(
    calc({ mortarX: "50", mortarY: "50", targetX: "50", targetY: "60" }),
  );

  expect(view.solution!.distanceMeters).toBe(1000);
  expect(view.solution!.inRange).toBe(false);
  expect(view.solution!.arcs).toHaveLength(0);
});

it("uses the selected weapon's arcs", () => {
  const view = deriveCalcView(
    calc({
      weaponId: "sph2",
      mortarX: "50",
      mortarY: "50",
      targetX: "65",
      targetY: "50",
    }),
  );

  expect(view.weapon.id).toBe("sph2");
  expect(view.solution!.arcs).toHaveLength(2);
});

it("edits one field immutably", () => {
  const before = calc({ mortarX: "50", targetY: "54" });

  const after = editCalcPoint(before, "target", "y", "60");

  expect(after).toEqual(calc({ mortarX: "50", targetY: "60" }));
  expect(before).toEqual(calc({ mortarX: "50", targetY: "54" }));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @artydog/desktop test -- src/calculator/derive.test.ts`
Expected: FAIL, cannot resolve `./derive`.

- [ ] **Step 3: Add the type, then the derivations**

In `src/calculator/types.ts`, append:

```ts
/// Raw calculator inputs shared between the main and overlay windows.
/// Serialized camelCase on the Rust side (CalcState in src-tauri state.rs).
export interface CalcState {
  weaponId: string;
  mortarX: string;
  mortarY: string;
  targetX: string;
  targetY: string;
}
```

Create `src/calculator/derive.ts`:

```ts
import { solve } from "./solution";
import type { CalcState, Solution, Weapon } from "./types";
import { parsePoint, type PointErrors } from "./validation";
import { DEFAULT_WEAPON_ID, WEAPONS, findWeapon } from "./weapons";

export interface CalcView {
  weapon: Weapon;
  mortarErrors: PointErrors;
  targetErrors: PointErrors;
  solution: Solution | null;
}

export function emptyCalcState(): CalcState {
  return {
    weaponId: "",
    mortarX: "",
    mortarY: "",
    targetX: "",
    targetY: "",
  };
}

/// While the user is still typing, an empty field is neutral rather
/// than "Required".
function visibleErrors(
  errors: PointErrors,
  x: string,
  y: string,
): PointErrors {
  return {
    ...(x !== "" && errors.x !== undefined ? { x: errors.x } : {}),
    ...(y !== "" && errors.y !== undefined ? { y: errors.y } : {}),
  };
}

export function deriveCalcView(calc: CalcState): CalcView {
  const weapon =
    findWeapon(calc.weaponId) ??
    findWeapon(DEFAULT_WEAPON_ID) ??
    WEAPONS[0];

  const mortar = parsePoint(calc.mortarX, calc.mortarY);
  const target = parsePoint(calc.targetX, calc.targetY);

  const solution =
    mortar.ok && target.ok
      ? solve(weapon, mortar.value, target.value)
      : null;

  return {
    weapon,
    mortarErrors: mortar.ok
      ? {}
      : visibleErrors(mortar.errors, calc.mortarX, calc.mortarY),
    targetErrors: target.ok
      ? {}
      : visibleErrors(target.errors, calc.targetX, calc.targetY),
    solution,
  };
}

export function editCalcPoint(
  calc: CalcState,
  point: "mortar" | "target",
  axis: "x" | "y",
  value: string,
): CalcState {
  if (point === "mortar") {
    return axis === "x"
      ? { ...calc, mortarX: value }
      : { ...calc, mortarY: value };
  }
  return axis === "x"
    ? { ...calc, targetX: value }
    : { ...calc, targetY: value };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @artydog/desktop test -- src/calculator/derive.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/calculator/types.ts apps/desktop/src/calculator/derive.ts apps/desktop/src/calculator/derive.test.ts
git commit -m "calculator: derive the view from shared CalcState"
```

---

### Task 4: frontend bridge for calc state

**Files:**
- Create: `apps/desktop/src/lib/calculatorState.ts`
- Test: `apps/desktop/src/lib/calculatorState.test.ts`

**Interfaces:**
- Consumes: `CalcState` from `../calculator/types`, `invoke`/`listen` from the Tauri JS API.
- Produces (used by Task 5): `CALC_STATE_EVENT: string`, `getCalcState(): Promise<CalcState>`, `setCalcState(calc: CalcState): Promise<CalcState>`, `onCalcStateChanged(handler: (calc: CalcState) => void): Promise<UnlistenFn>`.

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/lib/calculatorState.test.ts`, following the mock pattern of `overlay.test.ts`:

```ts
import { beforeEach, expect, it, vi } from "vitest";
import {
  getCalcState,
  onCalcStateChanged,
  setCalcState,
} from "./calculatorState";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}));

const SAMPLE = {
  weaponId: "mortar",
  mortarX: "50",
  mortarY: "50",
  targetX: "53",
  targetY: "54",
};

beforeEach(() => {
  invokeMock.mockReset();
  listenMock.mockReset();
});

it("getCalcState invokes get_calc_state", async () => {
  invokeMock.mockResolvedValue(SAMPLE);

  const calc = await getCalcState();

  expect(invokeMock).toHaveBeenCalledWith("get_calc_state");
  expect(calc).toEqual(SAMPLE);
});

it("setCalcState invokes set_calc_state with the full state", async () => {
  invokeMock.mockResolvedValue(SAMPLE);

  const calc = await setCalcState(SAMPLE);

  expect(invokeMock).toHaveBeenCalledWith("set_calc_state", { calc: SAMPLE });
  expect(calc).toEqual(SAMPLE);
});

it("onCalcStateChanged subscribes to the Rust event and unwraps the payload", async () => {
  const unlisten = vi.fn();
  listenMock.mockResolvedValue(unlisten);
  const handler = vi.fn();

  const dispose = await onCalcStateChanged(handler);

  expect(listenMock).toHaveBeenCalledWith(
    "calc-state-changed",
    expect.any(Function),
  );

  const listener = listenMock.mock.calls[0][1] as (event: {
    payload: unknown;
  }) => void;
  listener({ payload: SAMPLE });

  expect(handler).toHaveBeenCalledWith(SAMPLE);

  dispose();
  expect(unlisten).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @artydog/desktop test -- src/lib/calculatorState.test.ts`
Expected: FAIL, cannot resolve `./calculatorState`.

- [ ] **Step 3: Implement the bridge**

Create `apps/desktop/src/lib/calculatorState.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { CalcState } from "../calculator/types";

/// Must match CALC_STATE_EVENT in src-tauri/src/commands.rs.
export const CALC_STATE_EVENT = "calc-state-changed";

export async function getCalcState(): Promise<CalcState> {
  return invoke<CalcState>("get_calc_state");
}

export async function setCalcState(calc: CalcState): Promise<CalcState> {
  return invoke<CalcState>("set_calc_state", { calc });
}

export function onCalcStateChanged(
  handler: (calc: CalcState) => void,
): Promise<UnlistenFn> {
  return listen<CalcState>(CALC_STATE_EVENT, (event) =>
    handler(event.payload),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @artydog/desktop test -- src/lib/calculatorState.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/calculatorState.ts apps/desktop/src/lib/calculatorState.test.ts
git commit -m "lib: bridge calc state commands and events"
```

---

### Task 5: useCalcState hook

**Files:**
- Create: `apps/desktop/src/lib/useCalcState.ts`
- Test: `apps/desktop/src/lib/useCalcState.test.ts`

**Interfaces:**
- Consumes: `emptyCalcState` from `../calculator/derive`, the Task 4 bridge.
- Produces (used by Tasks 6-8 via App/Overlay): `useCalcState(): { calc: CalcState; updateCalc: (next: CalcState) => void; error: string | null }`.

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/lib/useCalcState.test.ts`. The bridge module is mocked so no Tauri APIs are touched. `renderHook` comes from `@testing-library/react` v16.

```tsx
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import { useCalcState } from "./useCalcState";

const getCalcStateMock = vi.fn();
const setCalcStateMock = vi.fn();
const onCalcStateChangedMock = vi.fn();
const unlistenMock = vi.fn();

vi.mock("./calculatorState", () => ({
  getCalcState: (...args: unknown[]) => getCalcStateMock(...args),
  setCalcState: (...args: unknown[]) => setCalcStateMock(...args),
  onCalcStateChanged: (...args: unknown[]) => onCalcStateChangedMock(...args),
}));

let listener: (calc: CalcState) => void = () => {};

function state(overrides: Partial<CalcState>): CalcState {
  return { ...emptyCalcState(), ...overrides };
}

beforeEach(() => {
  getCalcStateMock.mockReset();
  setCalcStateMock.mockReset();
  onCalcStateChangedMock.mockReset().mockImplementation((handler) => {
    listener = handler;
    return Promise.resolve(unlistenMock);
  });
  unlistenMock.mockClear();
});

afterEach(() => {
  cleanup();
});

it("starts empty and mirrors the state fetched on mount", async () => {
  getCalcStateMock.mockResolvedValue(state({ weaponId: "mortar" }));

  const { result } = renderHook(() => useCalcState());

  expect(result.current.calc).toEqual(emptyCalcState());
  await waitFor(() =>
    expect(result.current.calc.weaponId).toBe("mortar"),
  );
  expect(result.current.error).toBeNull();
});

it("replaces local state when the other window writes", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());
  const { result } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  await act(async () => {
    listener(state({ mortarX: "50" }));
  });

  expect(result.current.calc.mortarX).toBe("50");
});

it("applies an edit locally before the write completes", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());
  setCalcStateMock.mockReturnValue(new Promise(() => {}));
  const next = state({ mortarX: "12" });

  const { result } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  act(() => {
    result.current.updateCalc(next);
  });

  expect(result.current.calc).toEqual(next);
  expect(setCalcStateMock).toHaveBeenCalledWith(next);
});

it("surfaces a failed write and clears the error on the next success", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());
  const { result } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  setCalcStateMock.mockRejectedValue(new Error("ipc down"));
  act(() => {
    result.current.updateCalc(state({ mortarX: "12" }));
  });
  await waitFor(() => expect(result.current.error).not.toBeNull());

  setCalcStateMock.mockResolvedValue(state({ mortarX: "14" }));
  act(() => {
    result.current.updateCalc(state({ mortarX: "14" }));
  });
  await waitFor(() => expect(result.current.error).toBeNull());
});

it("surfaces a failed initial fetch", async () => {
  getCalcStateMock.mockRejectedValue(new Error("ipc down"));

  const { result } = renderHook(() => useCalcState());

  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.calc).toEqual(emptyCalcState());
});

it("stops listening on unmount", async () => {
  getCalcStateMock.mockResolvedValue(emptyCalcState());

  const { unmount } = renderHook(() => useCalcState());
  await waitFor(() => expect(getCalcStateMock).toHaveBeenCalled());

  unmount();

  await waitFor(() => expect(unlistenMock).toHaveBeenCalled());
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @artydog/desktop test -- src/lib/useCalcState.test.ts`
Expected: FAIL, cannot resolve `./useCalcState`.

- [ ] **Step 3: Implement the hook**

Create `apps/desktop/src/lib/useCalcState.ts`:

```ts
import { useCallback, useEffect, useState } from "react";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import {
  getCalcState,
  onCalcStateChanged,
  setCalcState,
} from "./calculatorState";

export interface UseCalcState {
  calc: CalcState;
  updateCalc: (next: CalcState) => void;
  error: string | null;
}

/// Rust owns the state; this hook is the window's mirror. Edits are
/// optimistic so typing never lags, and the event echo reconciles both
/// windows through one path.
export function useCalcState(): UseCalcState {
  const [calc, setCalc] = useState<CalcState>(emptyCalcState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const unlistenPromise = onCalcStateChanged((next) => {
      setCalc(next);
    });

    getCalcState()
      .then((initial) => {
        if (!disposed) {
          setCalc(initial);
        }
      })
      .catch((e: unknown) => {
        if (!disposed) {
          setError(String(e));
        }
      });

    return () => {
      disposed = true;
      void unlistenPromise
        .then((unlisten) => unlisten())
        .catch(() => {});
    };
  }, []);

  const updateCalc = useCallback((next: CalcState) => {
    setCalc(next);
    setCalcState(next)
      .then(() => setError(null))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  return { calc, updateCalc, error };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @artydog/desktop test -- src/lib/useCalcState.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/lib/useCalcState.ts apps/desktop/src/lib/useCalcState.test.ts
git commit -m "lib: add useCalcState hook mirroring the shared state"
```

---

### Task 6: WeaponSelect extraction and controlled Calculator

**Files:**
- Create: `apps/desktop/src/components/WeaponSelect.tsx`
- Modify: `apps/desktop/src/components/Calculator.tsx` (full rewrite of the component body)
- Modify: `apps/desktop/src/components/ResultPanel.tsx` (one copy string)
- Test: rewrite `apps/desktop/src/components/Calculator.test.tsx`

**Interfaces:**
- Consumes: `CalcState`, `deriveCalcView`, `editCalcPoint` from Task 3; existing `CoordinateInput` (`{ legend, idPrefix, value: { x, y }, errors, onChange: (axis, value) => void }`) and `ResultPanel` (`{ weapon, solution }`).
- Produces (used by Tasks 7, 8): `Calculator({ calc: CalcState, onChange: (next: CalcState) => void })` and `WeaponSelect({ weapon: Weapon, onWeaponChange: (id: string) => void })`.

- [ ] **Step 1: Rewrite the component tests (failing first)**

Replace the entire content of `apps/desktop/src/components/Calculator.test.tsx`. The component is now controlled, so a stateful Harness plays the role App will play:

```tsx
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import Calculator from "./Calculator";

afterEach(() => {
  cleanup();
});

function Harness({ initial }: { initial?: CalcState }) {
  const [calc, setCalc] = useState(initial ?? emptyCalcState());

  return <Calculator calc={calc} onChange={setCalc} />;
}

function setPoint(legend: string, x: string, y: string) {
  const group = screen.getByRole("group", { name: legend });

  fireEvent.change(within(group).getByLabelText("x"), { target: { value: x } });
  fireEvent.change(within(group).getByLabelText("y"), { target: { value: y } });
}

function rowValue(label: string): string {
  const row = screen.getByText(label).parentElement;

  return row?.lastElementChild?.textContent ?? "";
}

it("solves the reference vector live, with no button to click", () => {
  render(<Harness />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");

  expect(rowValue("Distance")).toBe("500 m");
  expect(rowValue("Azimuth")).toBe("36.9°");
  expect(rowValue("Elevation")).toBe("461 mil");
});

it("shows both arcs for a weapon that has them", () => {
  render(<Harness />);

  fireEvent.change(screen.getByLabelText("Weapon"), {
    target: { value: "sph2" },
  });
  setPoint("Mortar", "50", "50");
  setPoint("Target", "65", "50");

  expect(rowValue("Elevation Low")).toBe("84 mil");
  expect(rowValue("Elevation High")).toBe("1213 mil");
});

it("stays neutral while fields are empty instead of demanding input", () => {
  render(<Harness />);

  expect(screen.queryByText("Required")).not.toBeInTheDocument();
  expect(screen.queryByText("Must be a number")).not.toBeInTheDocument();
  expect(
    screen.getByText("Enter coordinates to see a firing solution."),
  ).toBeInTheDocument();
});

it("rejects non-numeric coordinates and keeps the other axis error", () => {
  render(<Harness />);

  setPoint("Mortar", "abc", "def");
  setPoint("Target", "53", "54");

  const mortar = screen.getByRole("group", { name: "Mortar" });
  expect(within(mortar).getAllByText("Must be a number")).toHaveLength(2);

  fireEvent.change(within(mortar).getByLabelText("x"), {
    target: { value: "50" },
  });

  expect(within(mortar).getAllByText("Must be a number")).toHaveLength(1);
  expect(screen.queryByText("Distance")).not.toBeInTheDocument();
});

it("flags a target outside the weapon range", () => {
  render(<Harness />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "50", "60");

  expect(rowValue("Distance")).toBe("1000 m");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Out of range for L81 Mortar",
  );
});

it("updates the solution live when the target moves", () => {
  render(<Harness />);

  setPoint("Mortar", "50", "50");
  setPoint("Target", "53", "54");
  expect(rowValue("Distance")).toBe("500 m");

  fireEvent.change(
    within(screen.getByRole("group", { name: "Target" })).getByLabelText("y"),
    { target: { value: "60" } },
  );

  expect(rowValue("Distance")).toBe("1000 m");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @artydog/desktop test -- src/components/Calculator.test.tsx`
Expected: FAIL. The current `Calculator` takes no props and renders a Calculate button; several assertions fail (for example "solves ... with no button" cannot find Distance without clicking).

- [ ] **Step 3: Create WeaponSelect**

Create `apps/desktop/src/components/WeaponSelect.tsx` with the markup lifted from today's Calculator:

```tsx
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
```

- [ ] **Step 4: Rewrite Calculator as a controlled component**

Replace the entire content of `apps/desktop/src/components/Calculator.tsx`:

```tsx
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

type PointName = "mortar" | "target";
type Axis = "x" | "y";

export default function Calculator({ calc, onChange }: CalculatorProps) {
  const view = deriveCalcView(calc);

  const editPoint = useCallback(
    (point: PointName) => (axis: Axis, value: string) => {
      onChange(editCalcPoint(calc, point, axis, value));
    },
    [calc, onChange],
  );

  return (
    <div className="flex flex-col gap-5">
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
```

- [ ] **Step 5: Fix the stale ResultPanel copy**

In `src/components/ResultPanel.tsx`, change the null-solution copy from `Enter coordinates and calculate to see a firing solution.` to `Enter coordinates to see a firing solution.`

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @artydog/desktop test -- src/components/Calculator.test.tsx`
Expected: PASS, 6 tests. Then run the full desktop suite to catch knock-ons: `pnpm --filter @artydog/desktop test`. Note: `App.tsx` still renders `<Calculator />` without props, so `pnpm build` will fail until Task 8; that is expected at this stage, the suite must still pass since no test renders the old App wiring.

- [ ] **Step 7: Lint and commit**

Run: `pnpm lint`
Expected: clean.

```bash
git add apps/desktop/src/components/WeaponSelect.tsx apps/desktop/src/components/Calculator.tsx apps/desktop/src/components/Calculator.test.tsx apps/desktop/src/components/ResultPanel.tsx
git commit -m "components: drive Calculator from shared state with live solutions"
```

---

### Task 7: OverlayCalculator

**Files:**
- Create: `apps/desktop/src/components/OverlayCalculator.tsx`
- Test: `apps/desktop/src/components/OverlayCalculator.test.tsx`

**Interfaces:**
- Consumes: everything from Task 6 plus `CalcState`, `deriveCalcView`, `editCalcPoint`.
- Produces (used by Task 8): `OverlayCalculator({ calc: CalcState, onChange: (next: CalcState) => void })`.

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/components/OverlayCalculator.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { emptyCalcState } from "../calculator/derive";
import type { CalcState } from "../calculator/types";
import OverlayCalculator from "./OverlayCalculator";

afterEach(() => {
  cleanup();
});

const SOLVED: CalcState = {
  ...emptyCalcState(),
  weaponId: "mortar",
  mortarX: "50",
  mortarY: "50",
  targetX: "53",
  targetY: "54",
};

function rowValue(label: string): string {
  const row = screen.getByText(label).parentElement;

  return row?.lastElementChild?.textContent ?? "";
}

it("renders weapon, inputs, and a solved result from props", () => {
  render(<OverlayCalculator calc={SOLVED} onChange={vi.fn()} />);

  expect(
    (screen.getByLabelText("Weapon") as HTMLSelectElement).value,
  ).toBe("mortar");
  expect(
    (within(screen.getByRole("group", { name: "Mortar" })).getByLabelText("x") as HTMLInputElement).value,
  ).toBe("50");
  expect(rowValue("Distance")).toBe("500 m");
});

it("propagates coordinate edits as full CalcState writes", () => {
  const onChange = vi.fn();
  render(<OverlayCalculator calc={SOLVED} onChange={onChange} />);

  const target = screen.getByRole("group", { name: "Target" });
  fireEvent.change(within(target).getByLabelText("y"), {
    target: { value: "60" },
  });

  expect(onChange).toHaveBeenCalledWith({ ...SOLVED, targetY: "60" });
});

it("propagates weapon changes as full CalcState writes", () => {
  const onChange = vi.fn();
  render(<OverlayCalculator calc={SOLVED} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Weapon"), {
    target: { value: "sph2" },
  });

  expect(onChange).toHaveBeenCalledWith({ ...SOLVED, weaponId: "sph2" });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @artydog/desktop test -- src/components/OverlayCalculator.test.ts`
Expected: FAIL, cannot resolve `./OverlayCalculator`.

- [ ] **Step 3: Implement OverlayCalculator**

Create `apps/desktop/src/components/OverlayCalculator.tsx`. Same children as Calculator with tighter spacing for the overlay geometry:

```tsx
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @artydog/desktop test -- src/components/OverlayCalculator.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/OverlayCalculator.tsx apps/desktop/src/components/OverlayCalculator.test.tsx
git commit -m "components: add compact OverlayCalculator"
```

---

### Task 8: wire both windows and enlarge the overlay default

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/Overlay.tsx`
- Modify: `apps/desktop/src-tauri/src/state.rs` (one constant)
- Modify: `apps/desktop/src-tauri/tauri.conf.json` (overlay window height)

**Interfaces:**
- Consumes: `useCalcState` (Task 5), `Calculator` (Task 6), `OverlayCalculator` (Task 7).
- Produces: the shipped app. No new interfaces.

- [ ] **Step 1: Rewire App.tsx**

Replace the content of `apps/desktop/src/App.tsx`:

```tsx
import Calculator from "./components/Calculator";
import OverlayControls from "./components/OverlayControls";
import UpdateBanner from "./components/UpdateBanner";
import { useCalcState } from "./lib/useCalcState";

export default function App() {
  const { calc, updateCalc, error } = useCalcState();

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-bold">ArtyDog</h1>

        <UpdateBanner />

        <div className="mt-6">
          <Calculator calc={calc} onChange={updateCalc} />
          {error !== null && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8">
          <OverlayControls />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewire Overlay.tsx**

Replace the content of `apps/desktop/src/Overlay.tsx`. The test input and counter button are gone; the drag bar, resize corner, hide button, and error reporting stay:

```tsx
import { useCallback, useState } from "react";
import OverlayCalculator from "./components/OverlayCalculator";
import { hideOverlay } from "./lib/overlay";
import { startOverlayResize } from "./lib/window";
import { useCalcState } from "./lib/useCalcState";

export default function Overlay() {
  const { calc, updateCalc, error: calcError } = useCalcState();
  const [windowError, setWindowError] = useState<string | null>(null);

  const onHide = useCallback(async () => {
    try {
      await hideOverlay();
      setWindowError(null);
    } catch (e) {
      setWindowError(String(e));
    }
  }, []);

  const onResize = useCallback(async () => {
    try {
      await startOverlayResize();
      setWindowError(null);
    } catch (e) {
      setWindowError(String(e));
    }
  }, []);

  const error = calcError ?? windowError;

  return (
    <div className="relative h-screen w-screen bg-neutral-900 text-neutral-100">
      <div className="flex h-full flex-col">
        {/* The whole bar drags, so its labels must not swallow the press. */}
        <div
          data-tauri-drag-region
          className="flex cursor-grab items-baseline gap-2 border-b border-neutral-800 px-4 py-2 active:cursor-grabbing"
        >
          <h1 className="pointer-events-none text-lg font-bold tracking-wide">ARTYDOG</h1>
          <p className="pointer-events-none text-xs text-neutral-400">Overlay</p>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          <OverlayCalculator calc={calc} onChange={updateCalc} />
          <button
            type="button"
            onClick={() => void onHide()}
            className="rounded bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600"
          >
            Hide Overlay
          </button>
          {error !== null && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      <div
        role="button"
        tabIndex={-1}
        aria-label="Resize overlay"
        onMouseDown={() => void onResize()}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize border-b-2 border-r-2 border-neutral-600 hover:border-neutral-400"
      />
    </div>
  );
}
```

- [ ] **Step 3: Raise the overlay default height to fit the calculator**

The calculator stack (weapon select, two coordinate groups, result panel) needs roughly 520 px; 300 would cut it off on a fresh install.

In `apps/desktop/src-tauri/src/state.rs`, change:

```rust
pub const OVERLAY_DEFAULT_HEIGHT: u32 = 300;
```

to:

```rust
pub const OVERLAY_DEFAULT_HEIGHT: u32 = 520;
```

In `apps/desktop/src-tauri/tauri.conf.json`, find the `overlay` window definition and change its height from `300` to `520` (keep width `400` and every other property untouched).

- [ ] **Step 4: Run every automated gate**

Run, in order, from the workspace root:

```bash
pnpm lint
pnpm test
pnpm build
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Expected: all four green. `pnpm build` now succeeds because App/Overlay pass the required props. The Rust `defaults_match_declared_constants` test references the constant, not a literal, so the height bump keeps it green.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/Overlay.tsx apps/desktop/src-tauri/src/state.rs apps/desktop/src-tauri/tauri.conf.json
git commit -m "main,overlay: run both windows on the shared calc state"
```

---

### Task 9: documentation and final verification

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/MILESTONES.md`

**Interfaces:**
- Consumes: the finished implementation.
- Produces: documentation matching the shipped behavior.

- [ ] **Step 1: Document the calc state flow**

Read `docs/ARCHITECTURE.md` and add a short section (near the overlay/visibility flow description, matching that document's heading style) covering:

```markdown
## Shared calculator state

Both windows edit one calculator state owned by Rust. `CalcState`
(`src-tauri/src/state.rs`) holds the raw input strings: `weaponId`,
`mortarX`, `mortarY`, `targetX`, `targetY`. Writes go through the
`set_calc_state` command, which stores the state and broadcasts
`calc-state-changed` to every window. Reads go through `get_calc_state`
on mount. `src/lib/useCalcState.ts` mirrors the state per window:
edits apply locally first so typing never lags, and the event echo is
the single path that reconciles both windows.

Nothing derived is ever shared. Each window runs `deriveCalcView`
(`src/calculator/derive.ts`), which resolves the weapon, parses the
inputs, shows errors only for non-empty invalid fields, and computes
the solution live. The main window renders `Calculator`, the overlay
renders `OverlayCalculator`; both are controlled components over the
same state.
```

- [ ] **Step 2: Tick the MVP checkbox**

In `docs/MILESTONES.md`, change:

```text
- [ ] Calculator state persists while toggling overlay.
```

to:

```text
- [x] Calculator state persists while toggling overlay.
```

- [ ] **Step 3: Final gates and commit**

Run: `pnpm lint && pnpm test && pnpm build && cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
Expected: all green.

```bash
git add docs/ARCHITECTURE.md docs/MILESTONES.md
git commit -m "docs: document the shared calc state flow"
```

- [ ] **Step 4: Hand the app to the operator for live verification**

Start the app:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 pnpm tauri dev
```

Operator checklist (needs a human at the machine):

1. Type coordinates in the main window; every keystroke appears live in the overlay (toggle it with Alt+M).
2. Type in the overlay; the main window mirrors it.
3. Switch the weapon in either window; both follow.
4. Hide the overlay with Alt+M and show it again; the calculator state is unchanged.
5. Enter an invalid coordinate; only that field shows an error, and no solution renders.
6. Enter an out-of-range target; distance renders with the "Out of range" status.
