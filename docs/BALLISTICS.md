# Ballistics and coordinates

Source data for the calculator, in `apps/desktop/src/calculator/data/weapons.json`.
Extracted and verified 2026-09-10.

This answers the open question left by `docs/MILESTONES.md` Milestone 1: the
game does not need a physics model. Elevation is a lookup in a firing table.

## Coordinates

Game coordinates are grid units, not meters. Every map uses the same scale:

```text
1 coordinate unit = 100 m
```

A grid cell of 1 unit is 100 m, so 1 km is 10x10 cells. The scale is uniform
across all maps (`metersPerUnit` in the data file), so the calculator needs no
per-map calibration to produce a solution.

## Solution math

```text
dx = target.x - mortar.x
dy = target.y - mortar.y

distance = hypot(dx, dy) * 100          // meters
azimuth  = atan2(dx, dy) in degrees
if azimuth < 0: azimuth += 360
```

`atan2(dx, dy)` rather than the usual `atan2(dy, dx)`: this puts 0 degrees at
north (+Y) and 90 degrees at east (+X), the compass convention the game uses.

Elevation is not computed. It is interpolated from the weapon's firing table.

## Firing tables

Each weapon carries one or more `arcs`, and each arc a `table` of
`[rangeMeters, mil]` pairs sorted ascending by range.

| Weapon | id | Range | MIL | Arcs |
| --- | --- | --- | --- | --- |
| L81 Mortar | `mortar` | 132-684 m | 150-850 | `single` (84 entries) |
| SPH-2 | `sph2` | 780-2629 m | 20-1390 | `low` (59), `high` (80) |

The mortar has one solution per range and its MIL *decreases* as range grows
(950 mil at 80 m down to 120 mil at 697 m). SPH-2 has two arcs, so it returns
a LOW and a HIGH solution for the same target.

Arcs are an ordered array rather than a map so both weapons are handled by the
same code path: solve every arc, present whichever come back.

### Implementation notes

- **The tables overhang the usable envelope.** The mortar table covers
  80-697 m while the weapon's range is 132-684 m. Use `range.minM` /
  `range.maxM` for the in-range decision, never the table bounds.
- **Interpolate linearly** between the two bracketing entries. Out of range
  returns no solution rather than an extrapolated one.
- **One range can carry two mils.** `sph2.high` has both 610 and 620 at
  2629 m, the top of its arc. That is the only such case in the current data,
  but the lookup should return a min/max pair for an exact hit on a duplicated
  range and render it as a span (`610-620`), not silently pick one.

## Verified test vectors

Both weapons reproduce a reference implementation exactly:

| Weapon | Mortar | Target | Distance | Azimuth | MIL |
| --- | --- | --- | --- | --- | --- |
| L81 Mortar | 50, 50 | 53, 54 | 500 m | 36.9 deg | 461 |
| SPH-2 | 50, 50 | 65, 50 | 1500 m | 90.0 deg | 84 low / 1213 high |

These are usable as the Milestone 6 exit criterion ("known test coordinates
produce known expected results").

## Maps

Preset maps are Bakurani, Ozeti and Zestafona.
Playable bounds, in coordinate units:

| Map | Grid | X | Y |
| --- | --- | --- | --- |
| Bakurani | 16x16 | 23.35-133.60 | 19.34-129.65 |
| Ozeti | 32x32 | 57.58-143.07 | 21.81-99.56 |
| Zestafona | 32x32 | 19.90-124.89 | 50.70-141.90 |

Bounds only matter for validating that a point is inside the playable area.
They do not affect the solution.
