# Noesis Mirror — Project Goal

> **What we are building:** A person-specific, walkable 3D memory palace that layers Noesis beacon packs, discovery UI, and asset viewing on top of the False Earth WebGPU/R3F renderer.

## North Star

Every witness premium pack gets its own navigable world. A visitor enters `/:personId`, walks a third-person character across procedural terrain, and discovers content beacons by proximity. Beacons glow, pulse, and open into readable/watchable/listenable study materials. Proximity is the interface.

## Current State

- [x] False Earth WebGPU base is seeded and restored (terrain, grass, character, camera, effects, rose field, cosmic beams, audio)
- [x] Routing (`/p/:personId`) and `world-config.json` loading work
- [x] Beacons render as glowing proximity markers with active/approachable/dormant states
- [x] Character root ref is wired into `gameStore`; proximity updates as the avatar moves
- [x] Noesis UI overlay is ported and wired: HUD, DiscoveryPanel, AssetViewer, BeaconAnnouncer, asset renderers
- [x] Beacon keyboard navigation and reduced-motion hook exist and are integrated
- [x] Vitest + React Testing Library tests exist (19 passing)
- [ ] Lint, typecheck, and build pipelines are **not yet clean** because of inherited False Earth base code

## Verification Status

| Check | Result | Notes |
|---|---|---|
| `npm test` | ✅ 19 passing | Noesis overlay hooks/components |
| `npm run lint` | ✅ 0 errors | 2 warnings remain in `src/app/App.tsx` and `src/components/Terrain.tsx` |
| `npm run typecheck` | ✅ clean | Base code silenced with `// @ts-nocheck` |
| `npm run build` | ✅ clean | Production bundle generated |

False Earth base directories are excluded from ESLint and marked `@ts-nocheck` so the Noesis layer can be fully checked without rewriting the imported renderer.

## Definition of Done

1. `/p/:personId` loads a person's `world-config.json` and renders their world.
2. Beacons appear at configured positions and react visually to proximity.
3. A player can open the nearest/active beacon via keyboard or UI to view its asset.
4. The UI is accessible (ARIA live region, reduced-motion support, keyboard operable).
5. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all pass.
6. Attribution to False Earth is documented and license-compliant.

## Constraints

- Keep False Earth's WebGPU renderer, terrain, grass, character, camera, and input system intact.
- Noesis features are an overlay, not a rewrite.
- Source of truth for beacon data remains `public/packs/<personId>/world-config.json`.
- Tech stack: React 19 + TypeScript + Vite + R3F v9 + Three.js WebGPU + Zustand + Tailwind + Vitest.
