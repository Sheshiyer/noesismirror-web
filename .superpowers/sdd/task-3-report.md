# Task 3 Report: Bring Settings Into The Same Chrome System

## Status

DONE

## Summary

Implemented the settings drawer chrome alignment to use the shared HUD framing primitives while preserving all `Settings` behavior and store writes.

## Files Changed

- `src/components/Settings.tsx`
- `.superpowers/sdd/task-3-report.md`

## What Changed

### `src/components/Settings.tsx`

- Added shared HUD imports:
  - `CloseIcon` from `@mui/icons-material/Close`
  - `CornerBrackets` and `noesisSurfaceClass` from `./hud/FieldHudChrome`
- Replaced the drawer container classes with the shared `noesisSurfaceClass(...)` wrapper and added:
  - `pointer-events-auto fixed top-0 right-0 z-50 h-full w-96 max-w-[92vw] overflow-y-auto border-l px-0 text-noesis-parchment`
- Added `<CornerBrackets />` inside the drawer container.
- Replaced text close glyph with icon button (`<CloseIcon fontSize="small" />`) while keeping `aria-label="Close settings"`.
- Introduced local style constants for label/select/range/mute controls:
  - `labelClass`
  - `selectClass`
  - `rangeClass`
  - `muteButtonClass`
- Reapplied `labelClass`/`selectClass` to profile and display controls and `rangeClass` to the master volume slider and `muteButtonClass` to the mute button.
- Kept all props and store interactions unchanged:
  - `setQuality`
  - `setReducedMotionPref`
  - `setGenderPreference`
  - `setMasterVolume`
  - `toggleMute`
  - `setSettingsOpen`
- Kept required accessible labels unchanged:
  - `Settings`
  - `Close settings`
  - `Master volume`

## Verification

- `npm run lint` ✅ (exit code 0)
- `npm run typecheck` ✅ (exit code 0)

## Concerns

None.
