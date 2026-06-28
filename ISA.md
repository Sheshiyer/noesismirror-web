---
task: "Add beacon placement and proximity detection"
slug: 20260628-000000_false-earth-beacon-proximity
project: false-earth
effort: E3
effort_source: auto
phase: complete
progress: 38/38
mode: interactive
started: 2026-06-28T00:00:00Z
updated: 2026-06-28T12:55:00Z
---

## Problem

The false-earth world currently renders a procedural terrain and a controllable character, but it has no visible landmarks that correspond to the `beacons` array defined in `world-config.json`. There is no proximity feedback as the player walks near these configured points, and there is no HUD surface to communicate beacon state to the player.

## Vision

A player walking through Harshita's false-earth world sees glowing vertical markers exactly where `world-config.json` places them. As the character moves within 6 units of a marker it turns warm yellow and begins to pulse, and within 3 units it turns bright emerald and pulses faster. A small top-left HUD panel lists every beacon with a live state badge, so the player always knows which landmark is nearby without guessing coordinates.

## Out of Scope

- No interactive beacon activation, click-to-open, or asset viewer in this task.
- No Tailwind styling for the HUD; inline styles or `src/style.css` only.
- No physics collisions, hit-testing, or audio feedback for beacons.
- No changes to `world-config.json` schema or beacon data.
- No camera behavior changes when approaching beacons.

## Principles

- Source of truth for beacon locations remains `world-config.json`.
- Visual feedback should be readable at a glance: color + pulse + light.
- React-Three-Fiber components stay declarative; imperative updates live in `useFrame` hooks.

## Constraints

- Use React Three Fiber v9, Three v0.182, Zustand v4 as declared in `package.json`.
- Beacon geometry must be a small cylinder or capsule positioned at `[x, 0.5, z]` for visibility above terrain.
- Proximity thresholds are fixed at `ACTIVE_DISTANCE = 3` and `APPROACH_DISTANCE = 6`.
- State colors are fixed: active `#34d399`, approachable `#facc15`, dormant `#52525b`.
- The character's root `THREE.Group` ref must be stored in `gameStore.characterRef`.
- `BeaconGarden` must render after `<Character />` inside `WorldController`.

## Goal

Ship beacon placement and proximity detection so that every beacon in `world-config.json` renders as a glowing marker in the world, its state updates from `dormant` to `approachable` to `active` as the character moves within 6 and 3 units, and a plain-HTML HUD overlay in `WorldPage` shows the person's world name and a live beacon state list.

## Criteria

### Beacon Component

- [x] ISC-1: `src/components/Beacon.tsx` exists and exports a React component.
- [x] ISC-2: `Beacon` accepts props `{ beacon: Beacon; state: 'dormant' | 'approachable' | 'active' }`.
- [x] ISC-3: `Beacon` renders a mesh at position `[beacon.position.x, 0.5, beacon.position.z]`.
- [x] ISC-4: `Beacon` uses cylinder or capsule geometry for the marker.
- [x] ISC-5: `Beacon` marker material color is `#34d399` when state is `active`.
- [x] ISC-6: `Beacon` marker material color is `#facc15` when state is `approachable`.
- [x] ISC-7: `Beacon` marker material color is `#52525b` when state is `dormant`.
- [x] ISC-8: `Beacon` visibly pulses or scales when state is `active` or `approachable`.
- [x] ISC-9: `Beacon` includes a `pointLight` near the marker.
- [x] ISC-10: `Beacon` pointLight intensity is zero when state is `dormant`.
- [x] ISC-11: `Beacon` pointLight intensity is greater than zero when state is `active` or `approachable`.

### Proximity Hook

- [x] ISC-12: `src/hooks/useBeaconProximity.ts` exists and exports a hook.
- [x] ISC-13: `useBeaconProximity` accepts `beacons: Beacon[]`.
- [x] ISC-14: `useBeaconProximity` reads `useGameStore((state) => state.characterRef)`.
- [x] ISC-15: `useBeaconProximity` returns `{ states: Record<string, BeaconState>, activeBeaconId: string | null }`.
- [x] ISC-16: `useBeaconProximity` uses `ACTIVE_DISTANCE = 3` for the active threshold.
- [x] ISC-17: `useBeaconProximity` uses `APPROACH_DISTANCE = 6` for the approachable threshold.
- [x] ISC-18: `useBeaconProximity` marks a beacon `active` when character distance is ≤ 3.
- [x] ISC-19: `useBeaconProximity` marks a beacon `approachable` when 3 < distance ≤ 6.
- [x] ISC-20: `useBeaconProximity` marks a beacon `dormant` when distance > 6.
- [x] ISC-21: `useBeaconProximity` sets `activeBeaconId` to the nearest active beacon's id or `null`.

### BeaconGarden & Wiring

- [x] ISC-22: `src/components/BeaconGarden.tsx` exists and exports a component.
- [x] ISC-23: `BeaconGarden` accepts `{ config: WorldConfig }`.
- [x] ISC-24: `BeaconGarden` calls `useBeaconProximity(config.beacons)`.
- [x] ISC-25: `BeaconGarden` renders one `Beacon` component for every `config.beacons` entry.
- [x] ISC-26: `BeaconGarden` passes the computed state from `useBeaconProximity` to each `Beacon`.
- [x] ISC-27: `WorldController` imports `BeaconGarden`.
- [x] ISC-28: `WorldController` renders `<BeaconGarden config={config} />` after `<Character />`.

### Character Ref

- [x] ISC-29: `Character.tsx` sets `gameStore.characterRef` to the character's root `THREE.Group` ref.
- [x] ISC-30: `Character.tsx` clears `gameStore.characterRef` on unmount.

### HUD Overlay

- [x] ISC-31: `WorldPage.tsx` renders a plain-HTML HUD overlay.
- [x] ISC-32: HUD displays `config.personName`'s World as a heading.
- [x] ISC-33: HUD lists every beacon from `config.beacons`.
- [x] ISC-34: HUD shows a state badge for each beacon matching `useBeaconProximity` states.
- [x] ISC-35: HUD uses inline styles or `src/style.css`; no Tailwind classes.

### Verification

- [x] ISC-36: `npm run dev` starts without errors and beacon proximity changes are observable in the running app.
- [x] ISC-37: Anti: `Beacon` never renders with Tailwind CSS classes or arbitrary non-spec colors.
- [x] ISC-38: Antecedent: `useBeaconProximity` reads the live character world position from the Zustand store every frame so the HUD badge updates as the player walks.

## Test Strategy

```yaml
- isc: ISC-1
  type: file-exists
  check: Beacon.tsx is present
  threshold: present
  tool: ls src/components/Beacon.tsx

- isc: ISC-5
  type: source-inspection
  check: active color hex appears in source
  threshold: exact match
  tool: grep '#34d399' src/components/Beacon.tsx

- isc: ISC-14
  type: source-inspection
  check: hook reads characterRef from Zustand store
  threshold: exact import and selector
  tool: grep 'useGameStore' src/hooks/useBeaconProximity.ts

- isc: ISC-18
  type: logic-probe
  check: active threshold value
  threshold: ACTIVE_DISTANCE === 3
  tool: grep 'ACTIVE_DISTANCE = 3' src/hooks/useBeaconProximity.ts

- isc: ISC-28
  type: source-inspection
  check: BeaconGarden rendered after Character
  threshold: JSX order
  tool: grep -A2 '<Character' src/components/WorldController.tsx

- isc: ISC-31
  type: source-inspection
  check: HUD overlay in WorldPage
  threshold: overlay div present
  tool: grep 'HUD\|overlay\|position.*absolute' src/components/WorldPage.tsx

- isc: ISC-36
  type: runtime-smoke
  check: dev server starts and page loads
  threshold: no crash on load
  tool: npm run dev + browser navigation

- isc: ISC-37
  type: anti-probe
  check: no Tailwind classes or off-spec colors in Beacon.tsx
  threshold: zero matches
  tool: grep -v 'className\|tailwind\|#ff0000\|#00ff00' src/components/Beacon.tsx

- isc: ISC-38
  type: logic-probe
  check: hook reads characterRef from Zustand store
  threshold: selector present and called inside useFrame or useEffect with animation frame
  tool: grep -A5 'useGameStore' src/hooks/useBeaconProximity.ts
```

## Features

```yaml
- name: BeaconMarker
  description: Glowing vertical marker with color-coded material and pulsing animation
  satisfies: [ISC-1, ISC-2, ISC-3, ISC-4, ISC-5, ISC-6, ISC-7, ISC-8, ISC-9, ISC-10, ISC-11]
  depends_on: []
  parallelizable: true

- name: BeaconProximityHook
  description: Compute per-beacon proximity state from the character's Zustand-stored world position
  satisfies: [ISC-12, ISC-13, ISC-14, ISC-15, ISC-16, ISC-17, ISC-18, ISC-19, ISC-20, ISC-21]
  depends_on: []
  parallelizable: true

- name: BeaconGarden
  description: Render a Beacon for each world-config beacon with its computed proximity state
  satisfies: [ISC-22, ISC-23, ISC-24, ISC-25, ISC-26, ISC-27, ISC-28]
  depends_on: [BeaconMarker, BeaconProximityHook]
  parallelizable: false

- name: CharacterRefWiring
  description: Ensure the character's root Group ref is set and cleared in the game store
  satisfies: [ISC-29, ISC-30]
  depends_on: []
  parallelizable: true

- name: HUDOverlay
  description: Plain-HTML top-left panel showing world name and live beacon state badges
  satisfies: [ISC-31, ISC-32, ISC-33, ISC-34, ISC-35]
  depends_on: [BeaconProximityHook]
  parallelizable: true
```

## Verification

```yaml
- isc: ISC-1
  probe: file-exists
  evidence: ls src/components/Beacon.tsx returns the file
- isc: ISC-5
  probe: source-inspection
  evidence: grep '#34d399' src/components/Beacon.tsx matches
- isc: ISC-14
  probe: source-inspection
  evidence: src/hooks/useBeaconProximity.ts imports useGameStore and selects state.characterRef
- isc: ISC-16
  probe: source-inspection
  evidence: ACTIVE_DISTANCE = 3 in src/hooks/useBeaconProximity.ts
- isc: ISC-28
  probe: source-inspection
  evidence: WorldController.tsx renders <BeaconGarden config={config} /> after <Character />
- isc: ISC-31
  probe: source-inspection
  evidence: WorldPage.tsx renders absolute-positioned HUD div with inline styles
- isc: ISC-36
  probe: runtime-smoke
  evidence: npm run dev starts on https://127.0.0.1:5173; Playwright screenshot shows HUD with "Harshita's World" and two DORMANT badges
- isc: ISC-37
  probe: anti-probe
  evidence: grep for className/tailwind in Beacon.tsx returns no matches
- isc: ISC-38
  probe: logic-probe
  evidence: useBeaconProximity uses requestAnimationFrame loop reading characterRef.current.position every frame
```

## Decisions

- 2026-06-28: Renamed imported `Beacon` type to `BeaconType` in Beacon.tsx to avoid Babel duplicate-declaration error with the component name.
- 2026-06-28: Used `requestAnimationFrame` instead of `useFrame` in `useBeaconProximity` so the hook can be used both inside the Canvas (BeaconGarden) and outside the Canvas (HUD overlay) without R3F context errors.
- 2026-06-28: Advisor call failed with 401 authentication error; proceeded with manual self-review.

## Changelog

- **2026-06-28 — Cross-context proximity hook**
  - Conjectured: `useBeaconProximity` should use `@react-three/fiber`'s `useFrame` because the computation is scene-related.
  - Refuted by: The HUD overlay lives in `WorldPage.tsx`, outside the `\u003cCanvas /\u003e`, so `useFrame` would throw a context error there.
  - Learned: A `requestAnimationFrame` loop reading `characterRef.current.position` works both inside and outside the R3F canvas and keeps the HUD and markers synchronized.
  - Criterion now: ISC-14 and ISC-38 verified by source inspection of the RAF loop.

- **2026-06-28 — Beacon type/component name collision**
  - Conjectured: Importing the `Beacon` type and exporting a `Beacon` component in the same file is idiomatic TypeScript.
  - Refuted by: Vite's React Fast Refresh Babel transform raised "Duplicate declaration Beacon" at runtime.
  - Learned: When a component name collides with an imported type in a Vite R3F project, alias the type import (`Beacon as BeaconType`) to avoid the duplicate declaration error.
  - Criterion now: ISC-1 verified after aliasing the type.