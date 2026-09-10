import data from "./data/weapons.json";
import type { Weapon } from "./types";

/// Game coordinates are grid units; one unit is 100 m on every map.
export const METERS_PER_UNIT: number = data.metersPerUnit;

export const WEAPONS: readonly Weapon[] = data.weapons.map((weapon) => ({
  ...weapon,
  arcs: weapon.arcs.map((arc) => ({
    ...arc,
    table: arc.table.map(([range, mil]) => [range, mil] as const),
  })),
}));

export const DEFAULT_WEAPON_ID: string = data.defaultWeapon;

export function findWeapon(id: string): Weapon | undefined {
  return WEAPONS.find((weapon) => weapon.id === id);
}
