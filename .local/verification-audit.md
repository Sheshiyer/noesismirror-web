# Verification Error Ownership Audit

Date: 2026-06-29

## Lint errors

All 72 errors + 16 warnings are in inherited False Earth base code:

- `src/components/character/**/*`
- `src/components/grass/**/*`
- `src/components/Rose/**/*`
- `src/components/cosmic/**/*`
- `src/components/background/**/*`
- `src/components/Effects/**/*`
- `src/components/camera/**/*`
- `src/debug/**/*`
- `src/ui/**/*`

No errors in Noesis overlay files:
- `src/components/Beacon.tsx`
- `src/components/BeaconGarden.tsx`
- `src/components/DiscoveryPanel.tsx`
- `src/components/AssetViewer.tsx`
- `src/components/BeaconAnnouncer.tsx`
- `src/components/WorldPage.tsx`
- `src/components/Home.tsx`
- `src/hooks/useWorldConfig.ts`
- `src/hooks/useBeaconProximity.ts`
- `src/hooks/useBeaconKeyboard.ts`
- `src/hooks/useReducedMotion.ts`
- `src/types/world.ts`
- `src/utils/buildWorldConfig.ts`
- `src/utils/cycleIndex.ts`

Hybrid files `src/app/App.tsx` and `src/components/WorldController.tsx` are also clean.

## Typecheck errors

All type errors are in the same base directories plus:
- `src/components/Terrain.tsx`
- `src/core/shaders/terrainHelpers.ts`

No type errors in Noesis overlay or hybrid files.

## Decision

Isolate the False Earth base directories from ESLint and TypeScript typecheck. Noesis overlay and hybrid files remain checked.
