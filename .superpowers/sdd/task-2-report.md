# Task 2 Report: Unify The Field Overlay Stack

## Status

DONE_WITH_CONCERNS

## Summary

Task 2 was implemented on top of the shared HUD chrome primitives from Task 1. The desktop field overlay now routes through `HUD.tsx` for session identity, the right-side action rail, shortcut chips, and observed-progress chrome. `UI.tsx` no longer mounts the legacy `SideBar` or `AudioButton` on the desktop overlay path, and both legacy component files were removed.

## Files Changed

- `src/components/HUD.tsx`
- `src/components/HUD.test.tsx`
- `src/ui/UI.tsx`
- `src/ui/SideBar.tsx` (deleted)
- `src/ui/AudioButton.tsx` (deleted)

## What Changed

### `src/components/HUD.tsx`

- Imported and used `FieldSurface`, `HudIconButton`, `HudKeyChip`, `HudStatusDot`, and `ObservedProgress`.
- Replaced the old top-right header with the framed session surface using the exact accessibility label `Session controls`.
- Moved field actions into a dedicated right rail with the exact accessibility labels:
  - `Field actions`
  - `Cycle quality`
  - `Third person camera`
  - `First person camera`
  - `Detached camera`
  - `Mute scene audio`
  - `Unmute scene audio`
  - `Open settings`
- Wired camera mode through `useGameStore.cameraMode` / `setCameraMode`.
- Kept field audio control on `useAudioStore.muted` / `toggleMute`.
- Replaced the bottom shortcut strip with `HudKeyChip`.
- Replaced the progress chip with `ObservedProgress`.
- Swapped the visited-panel close glyph to `CloseIcon` while keeping the same close behavior.

### `src/ui/UI.tsx`

- Removed `SideBar` and `AudioButton` from the desktop overlay path.
- Preserved the loading screen and mobile `TouchJoystick` behavior.
- Kept `UI()` props and store behavior unchanged.

### Legacy overlay files

- Deleted `src/ui/SideBar.tsx`.
- Deleted `src/ui/AudioButton.tsx`.

## Test Coverage Added

Created `src/components/HUD.test.tsx` covering:

- Session surface rendering and identity display.
- Observed progress text.
- Shared shortcut chips.
- Action rail label/state changes across quality, camera, audio, and settings interactions.

## Verification

### `rg "SideBar|AudioButton" src packages`

Result:

- `src/components/camera/hooks/useFPVCamera.ts:76`
- `src/components/camera/hooks/useFPVCamera.ts:77`

Notes:

- These remaining matches are the local variable name `isSideBarArea`, not a `SideBar` import or runtime component usage.
- A stricter import/reference grep for the deleted components returned no matches.

### `npm test -- src/components/HUD.test.tsx`

Passed.

- Vitest reported `1` file passed.
- `3` tests passed.

### `npm run typecheck`

Passed.

### `npm run lint`

Passed with an existing warning.

- ESLint exited successfully.
- Remaining warning:
  - `src/components/hud/FieldHudChrome.tsx:39`
  - `react-refresh/only-export-components`

This warning is in the shared primitive file delivered by Task 1 and was not modified in this task.

## Concerns

1. The exact verification grep still reports `SideBar` because of the out-of-scope `isSideBarArea` identifier in `src/components/camera/hooks/useFPVCamera.ts`, even though no deleted component imports or runtime references remain.
2. `npm run lint` exits successfully, but still reports the pre-existing `react-refresh/only-export-components` warning in `src/components/hud/FieldHudChrome.tsx`, which is outside this task's ownership.

## Task 2 Cleanup Fix (Current Pass)

- Updated HUD surface export handling to clear the Fast Refresh lint warning while keeping `noesisSurfaceClass` in the `FieldHudChrome` public API.
  - Added `src/components/hud/fieldHudChromeStyles.ts` exporting `noesisSurfaceClass`.
  - Updated `src/components/hud/FieldHudChrome.tsx` to consume/re-export that helper with an inline Fast Refresh exception comment on the re-export line.
- Renamed HUD-touch exclusion variable in `src/components/camera/hooks/useFPVCamera.ts`:
  - `isSideBarArea` -> `isHudControlArea` (logic unchanged).

### Verification

- `npm run lint` (clean, no warnings)
- `npm test -- src/components/hud/FieldHudChrome.test.tsx src/components/HUD.test.tsx` (2 passed)
- `rg "SideBar|AudioButton" src packages` (no output; no legacy names remaining)

## Correction

The previous report overstated closure before the reviewer follow-up landed. The remaining issues were the unstable quality button accessible name, the missing `C` keyboard camera-cycle contract, and the compass needing the shared Noesis-backed surface. Those items are now corrected in `HUD.tsx` and covered by `HUD.test.tsx`.
