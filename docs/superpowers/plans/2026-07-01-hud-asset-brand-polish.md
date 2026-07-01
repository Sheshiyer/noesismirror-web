# HUD Asset Brand Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-field HUD, settings controls, asset panels, and asset error states render as one readable Tryambakam Noesis overlay system over dense 3D scenery, with no detached legacy controls and no invisible or low-contrast always-on elements.
**Architecture:** Add a small shared React HUD chrome layer, route the current HUD, legacy `UI` side rail, settings drawer, and asset viewer surfaces through it, then verify by unit tests plus a live visual smoke of the Harshita field.
**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Zustand, Material UI icons already present in `package.json`, Vitest, Testing Library.

## Global Constraints

- Keep this pass scoped to overlay UI, HUD controls, settings chrome, and asset viewer states.
- Do not add a new UI dependency; use Tailwind, existing brand CSS variables, and existing `@mui/icons-material`.
- Preserve current keyboard contracts: `WASD`, `SHIFT`, `G`, `ESC`, `M`, `P`, `H`, `Q`, `B`, `F`, `V`, `S`, and `C`.
- Keep the field as the first usable screen after loading; do not introduce a landing-page interstitial.
- All always-on HUD text must sit on a readable backing surface when it overlaps grass, stars, or bright geometry.
- Keep cards at 8px radius or less. Prefer hairline Noesis frames over large rounded cards.
- Preserve auth/session controls and make sign-out reachable with keyboard focus.
- Respect reduced motion by avoiding new required animations.
- Do not rework beacon geometry, R2 asset sync, API routes, or world data in this pass.
- Run lint, typecheck, tests, and build before final handoff.

---

## Current-State Review

The three supplied screenshots show the same root problem from different edges of the field:

- Top-right identity and controls: the email and `[ sign out ]` in `HUD.tsx` render as unframed text, while the visible black rounded action buttons come from `src/ui/SideBar.tsx`. These are two overlay systems occupying the same corner.
- Bottom-right progress: `0 of 10 mirrors observed` is present in `HUD.tsx`, but it renders directly over noisy grass geometry with only translucent text and a dot.
- Bottom-center controls: `WASD`, `SHIFT`, `G`, `ESC` are present in `HUD.tsx`, but each chip is too transparent over dense scene texture.
- Settings and asset panels use separate styling systems. `Settings.tsx` has a good Noesis frame, `AssetViewer.tsx` has a second frame vocabulary, and `renderers.tsx` has its own `ErrorBlock`.
- `src/ui/AudioButton.tsx` is a legacy WebGPU mini-canvas with its own BGM tracks. The field now has `src/components/AmbientAudio.tsx` and the asset viewer ducks that audio, so the legacy button is visual and audio risk.
- The existing brand north-star is `docs/superpowers/specs/2026-06-30-noesis-ui-bento.png`; module 5 (HUD overlays), module 6 (modal anatomy), and module 7 (world UI labels) are the visual anchors for this pass.

## Files To Create

- `src/components/hud/FieldHudChrome.tsx`
  - Shared overlay surface classes, icon button, key chip, status dot, progress meter, and corner brackets.
- `src/components/hud/FieldHudChrome.test.tsx`
  - Accessibility and class contract tests for shared HUD primitives.
- `src/components/HUD.test.tsx`
  - Regression tests that core always-on HUD pieces render with readable labels and controls.

## Files To Modify

- `src/components/HUD.tsx`
  - Use shared HUD chrome; fold camera, quality, audio, settings, progress, session, and shortcut surfaces into one overlay system.
- `src/ui/UI.tsx`
  - Remove the duplicate field overlay rail once controls move into `HUD.tsx`.
- `src/ui/SideBar.tsx`
  - Stop rendering the off-brand rail in the field. Either delete after `UI.tsx` no longer imports it, or leave an unused export only if another route still imports it.
- `src/ui/AudioButton.tsx`
  - Stop mounting the legacy WebGPU audio control and `Bgm` tracks in the field overlay path.
- `src/components/Settings.tsx`
  - Swap local frame classes to shared HUD chrome and improve control density without changing store behavior.
- `src/components/AssetViewer.tsx`
  - Share the same surface/header/action treatment as the HUD and keep the scene-audio state readable.
- `src/components/assetRenderers/renderers.tsx`
  - Reuse shared error/action classes and make audio, video, PDF, reading, and study states visually consistent.

## Public Interfaces

- `FieldSurface(props)` renders a Noesis framed surface with optional `role`, `aria-label`, `className`, and children.
- `HudIconButton(props)` renders an accessible icon button for HUD rails and asset headers.
- `HudKeyChip(props)` renders a readable shortcut chip.
- `HudStatusDot(props)` renders audio, network, or active-state dots with accessible labels.
- `ObservedProgress(props)` renders mirror progress text plus a compact ring.

## Task 1: Add Shared HUD Chrome Primitives

**Files**

- Create `src/components/hud/FieldHudChrome.tsx`
- Create `src/components/hud/FieldHudChrome.test.tsx`

**Interfaces**

```ts
export interface FieldSurfaceProps {
  children: React.ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

export interface HudIconButtonProps {
  label: string;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export interface HudStatusDotProps {
  label: string;
  tone: 'gold' | 'emerald' | 'silver' | 'red';
  pulse?: boolean;
}

export interface ObservedProgressProps {
  observed: number;
  total: number;
  healthLabel: string;
  healthTone: HudStatusDotProps['tone'];
}
```

**Implementation**

- [ ] Add the chrome file with shared classes and components:

```tsx
import type { ReactNode } from 'react';

const surface =
  'relative border border-noesis-gold/35 bg-noesis-void/75 text-noesis-parchment shadow-[0_0_30px_rgba(7,11,29,0.55)] backdrop-blur-md';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-noesis-void';

export function noesisSurfaceClass(extra = '') {
  return `${surface} ${extra}`.trim();
}

export function CornerBrackets() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -top-px -left-px h-3 w-3 border-t border-l border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -top-px -right-px h-3 w-3 border-t border-r border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-noesis-gold" />
      <span aria-hidden className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-noesis-gold" />
    </>
  );
}

export function FieldSurface({
  children,
  className = '',
  role,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}) {
  return (
    <div role={role} aria-label={ariaLabel} className={noesisSurfaceClass(className)}>
      <CornerBrackets />
      {children}
    </div>
  );
}

export function HudIconButton({
  label,
  title,
  pressed,
  disabled,
  children,
  onClick,
  className = '',
}: {
  label: string;
  title?: string;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center border border-noesis-gold/35 bg-noesis-void/70 text-noesis-parchment transition-colors hover:border-noesis-emerald hover:text-noesis-emerald disabled:opacity-40 ${focus} ${className}`}
    >
      {children}
    </button>
  );
}

export function HudKeyChip({ children }: { children: ReactNode }) {
  return (
    <span className="min-w-12 border border-noesis-gold/45 bg-noesis-void/80 px-3 py-1 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-gold shadow-[0_0_18px_rgba(7,11,29,0.5)]">
      {children}
    </span>
  );
}

const dotTone = {
  gold: 'bg-noesis-gold',
  emerald: 'bg-noesis-emerald',
  silver: 'bg-noesis-parchment/40',
  red: 'bg-red-500',
};

export function HudStatusDot({
  label,
  tone,
  pulse = false,
}: {
  label: string;
  tone: keyof typeof dotTone;
  pulse?: boolean;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-block h-2 w-2 rounded-full ${dotTone[tone]} ${pulse ? 'motion-safe:animate-pulse' : ''}`}
    />
  );
}

export function ObservedProgress({
  observed,
  total,
  healthLabel,
  healthTone,
}: {
  observed: number;
  total: number;
  healthLabel: string;
  healthTone: keyof typeof dotTone;
}) {
  const clamped = total > 0 ? Math.min(1, Math.max(0, observed / total)) : 0;
  const pct = Math.round(clamped * 100);
  return (
    <FieldSurface className="flex items-center gap-3 px-4 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-parchment/80">
        {observed} of {total} mirrors observed
      </span>
      <span className="relative grid h-7 w-7 place-items-center" aria-label={`${pct}% observed`}>
        <span className="absolute inset-0 rounded-full border border-noesis-gold/25" />
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-noesis-emerald"
          style={{ clipPath: `inset(${100 - pct}% 0 0 0)` }}
        />
        <HudStatusDot label={healthLabel} tone={healthTone} pulse={healthTone === 'emerald'} />
      </span>
    </FieldSurface>
  );
}
```

- [ ] Add primitive tests:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldSurface, HudIconButton, HudKeyChip, ObservedProgress } from './FieldHudChrome';

describe('FieldHudChrome', () => {
  it('renders framed HUD surfaces with accessible labels', () => {
    render(<FieldSurface ariaLabel="Session controls">content</FieldSurface>);
    expect(screen.getByLabelText('Session controls')).toHaveClass('border-noesis-gold/35');
  });

  it('renders HUD icon buttons with labels and pressed state', () => {
    render(
      <HudIconButton label="Open settings" pressed onClick={vi.fn()}>
        S
      </HudIconButton>,
    );
    expect(screen.getByLabelText('Open settings')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders readable key chips', () => {
    render(<HudKeyChip>WASD</HudKeyChip>);
    expect(screen.getByText('WASD')).toHaveClass('bg-noesis-void/80');
  });

  it('renders observed progress text and percent label', () => {
    render(
      <ObservedProgress observed={2} total={10} healthLabel="Connection healthy" healthTone="emerald" />,
    );
    expect(screen.getByText('2 of 10 mirrors observed')).toBeInTheDocument();
    expect(screen.getByLabelText('20% observed')).toBeInTheDocument();
  });
});
```

**Verification**

- [ ] Run `npm test -- src/components/hud/FieldHudChrome.test.tsx`.
- [ ] Expected result: Vitest exits 0 and reports `FieldHudChrome.test.tsx`.

**Commit**

- [ ] `git add src/components/hud/FieldHudChrome.tsx src/components/hud/FieldHudChrome.test.tsx`
- [ ] `git commit -m "feat: add noesis HUD chrome primitives"`

## Task 2: Unify The Field Overlay Stack

**Files**

- Modify `src/components/HUD.tsx`
- Modify `src/ui/UI.tsx`
- Modify `src/ui/SideBar.tsx`
- Modify `src/ui/AudioButton.tsx`
- Create `src/components/HUD.test.tsx`

**Root Cause**

`WorldPage` renders `HUD`, while `App` renders `UI`, and `UI` renders `SideBar` plus `AudioButton`. This creates two unrelated overlay stacks at the same z-index family. The screenshot's right-side black rounded buttons come from `SideBar`, while identity, progress, and shortcuts come from `HUD`.

**Interfaces**

- Keep `HUDProps` unchanged: `{ personId: string; personName?: string; beacons: Beacon[] }`.
- Keep `UI()` props unchanged.
- HUD action labels become the stable accessibility surface: `Field actions`, `Cycle quality`, `Third person camera`, `First person camera`, `Detached camera`, `Mute scene audio`, `Unmute scene audio`, and `Open settings`.
- `SideBar` and `AudioButton` must have zero imports from runtime code after removal from `UI.tsx`.

**Implementation**

- [ ] In `HUD.tsx`, import shared chrome and existing Material UI icons:

```tsx
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import ThreeSixtyIcon from '@mui/icons-material/ThreeSixty';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { CameraMode } from '../core/store/gameStore';
import {
  FieldSurface,
  HudIconButton,
  HudKeyChip,
  HudStatusDot,
  ObservedProgress,
} from './hud/FieldHudChrome';
```

- [ ] In `HUD.tsx`, select camera state from the game store and keep audio mute control on the existing audio store:

```tsx
const cameraMode = useGameStore((s) => s.cameraMode);
const setCameraMode = useGameStore((s) => s.setCameraMode);
```

- [ ] Replace the current top-right header with a framed identity surface:

```tsx
<FieldSurface
  ariaLabel="Session controls"
  className="pointer-events-auto absolute top-4 right-20 flex max-w-[min(34rem,calc(100vw-7rem))] items-center gap-3 px-4 py-2"
>
  {userEmail && (
    <span className="truncate font-mono text-[11px] text-noesis-parchment/70">
      {userEmail}
    </span>
  )}
  <button
    type="button"
    onClick={handleSignOut}
    className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-noesis-gold transition-colors hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
  >
    Sign out
  </button>
  {muted && <span className="font-mono text-[10px] text-noesis-gold line-through">audio</span>}
  <HudStatusDot
    label={audioActive ? 'Scene audio active' : 'Scene audio inactive'}
    tone={audioActive ? 'emerald' : 'silver'}
    pulse={audioActive}
  />
</FieldSurface>
```

- [ ] Add a branded right action rail inside `HUD.tsx` and remove reliance on `SideBar`:

```tsx
const cameraConfig = {
  [CameraMode.Follow]: { label: 'Third person camera', icon: <PersonIcon fontSize="small" /> },
  [CameraMode.FPV]: { label: 'First person camera', icon: <VisibilityIcon fontSize="small" /> },
  [CameraMode.Detached]: { label: 'Detached camera', icon: <ThreeSixtyIcon fontSize="small" /> },
};
const nextCameraMode = () => setCameraMode((cameraMode + 1) % 3);
const qualityLabel = quality === 'high' ? 'High quality' : quality === 'medium' ? 'Medium quality' : 'Low quality';
```

```tsx
<nav
  aria-label="Field actions"
  className="pointer-events-auto absolute top-4 right-4 flex flex-col gap-2"
>
  <HudIconButton label={`Cycle quality: ${qualityLabel}`} title="Cycle quality (Q)" onClick={() => {
    const next = nextQuality(quality);
    setQuality(next);
    showToast(`QUALITY: ${next.toUpperCase()}`);
  }}>
    <AutoAwesomeIcon fontSize="small" />
  </HudIconButton>
  <HudIconButton label={cameraConfig[cameraMode].label} title="Cycle camera (C)" onClick={nextCameraMode}>
    {cameraConfig[cameraMode].icon}
  </HudIconButton>
  <HudIconButton label={muted ? 'Unmute scene audio' : 'Mute scene audio'} title="Toggle scene audio (M)" pressed={!muted} onClick={toggleMute}>
    {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
  </HudIconButton>
  <HudIconButton label="Open settings" title="Settings (S)" pressed={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>
    <SettingsIcon fontSize="small" />
  </HudIconButton>
</nav>
```

- [ ] Replace the bottom-center chip strip with `HudKeyChip`:

```tsx
{isGameStarted && (
  <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
    {KEYBOARD_KEYS.map((key) => (
      <HudKeyChip key={key}>{key}</HudKeyChip>
    ))}
  </div>
)}
```

- [ ] Replace the progress chip with `ObservedProgress`:

```tsx
<div className="pointer-events-none absolute right-6 bottom-6">
  <ObservedProgress
    observed={visitedCount}
    total={beaconTotal}
    healthLabel={healthLabel[health]}
    healthTone={health === 'ok' ? 'emerald' : health === 'slow' ? 'gold' : health === 'fail' ? 'red' : 'silver'}
  />
</div>
```

- [ ] In `src/ui/UI.tsx`, remove `AudioButton` and `SideBar` from the desktop overlay path:

```tsx
import { LoadingScreen } from './LoadingScreen';
import { TouchJoystick } from '../core/input/TouchJoystick';
import { input } from '../core/input/controls';
import { useGameStore } from '../core/store/gameStore';
```

```tsx
<div
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    opacity: isControlEnabled ? 1 : 0,
    visibility: isControlEnabled ? 'visible' : 'hidden',
    transition: `opacity 0.5s ease, visibility 0s linear ${isControlEnabled ? '0s' : '0.5s'}`,
  }}
>
  {isMobile && (
    <TouchJoystick
      input={input}
      actions={{
        forward: 'MoveForward',
        backward: 'MoveBackward',
        left: 'RotateLeft',
        right: 'RotateRight',
        run: 'Run',
      }}
    />
  )}
</div>
```

- [ ] Delete `src/ui/SideBar.tsx` and `src/ui/AudioButton.tsx` if no imports remain after `rg "SideBar|AudioButton" src packages`.
- [ ] If deletion reveals external package usage, leave the files but remove their import from `UI.tsx`; document the remaining import path in the final handoff.
- [ ] Add `HUD.test.tsx` covering session, progress, shortcut chips, and action rail labels.

**Verification**

- [ ] Run `rg "SideBar|AudioButton" src packages`.
- [ ] Expected result after deletion: no matches, or only deliberate references in tests/docs.
- [ ] Run `npm test -- src/components/HUD.test.tsx`.
- [ ] Expected result: Vitest exits 0 and reports `HUD.test.tsx`.
- [ ] Run `npm run lint`.
- [ ] Expected result: ESLint exits 0.

**Commit**

- [ ] `git add src/components/HUD.tsx src/components/HUD.test.tsx src/ui/UI.tsx src/ui/SideBar.tsx src/ui/AudioButton.tsx`
- [ ] `git commit -m "fix: unify field HUD overlay controls"`

## Task 3: Bring Settings Into The Same Chrome System

**Files**

- Modify `src/components/Settings.tsx`

**Interfaces**

- Keep `Settings()` props unchanged.
- Keep store writes unchanged: `setQuality`, `setReducedMotionPref`, `setGenderPreference`, `setMasterVolume`, `toggleMute`, and `setSettingsOpen`.
- Keep stable accessible labels: `Settings`, `Close settings`, and `Master volume`.

**Implementation**

- [ ] Import shared chrome:

```tsx
import CloseIcon from '@mui/icons-material/Close';
import { CornerBrackets, noesisSurfaceClass } from './hud/FieldHudChrome';
```

- [ ] Replace the drawer container class with the shared surface class:

```tsx
<aside
  role="dialog"
  aria-label="Settings"
  className={noesisSurfaceClass(
    'pointer-events-auto fixed top-0 right-0 z-50 h-full w-96 max-w-[92vw] overflow-y-auto border-l px-0 text-noesis-parchment',
  )}
>
  <CornerBrackets />
```

- [ ] Replace the close glyph with an icon button while preserving its label:

```tsx
<button
  type="button"
  onClick={() => setOpen(false)}
  aria-label="Close settings"
  className="grid h-9 w-9 place-items-center border border-noesis-gold/35 text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
>
  <CloseIcon fontSize="small" />
</button>
```

- [ ] Normalize select, range, and mute button classes into local constants:

```tsx
const labelClass = 'flex items-center justify-between gap-4 font-sans text-xs uppercase tracking-[0.18em]';
const selectClass = 'border border-noesis-gold/40 bg-noesis-void px-2 py-1 font-sans text-xs uppercase tracking-[0.16em] text-noesis-parchment focus:border-noesis-gold focus:outline-none';
```

- [ ] Keep all store behavior unchanged: quality, reduced motion, gender, volume, mute, and last sync.

**Verification**

- [ ] Run `npm run lint`.
- [ ] Expected result: ESLint exits 0.
- [ ] Run `npm run typecheck`.
- [ ] Expected result: TypeScript exits 0.

**Commit**

- [ ] `git add src/components/Settings.tsx`
- [ ] `git commit -m "fix: align settings drawer with noesis HUD chrome"`

## Task 4: Reframe Asset Viewer Header And Media State

**Files**

- Modify `src/components/AssetViewer.tsx`
- Modify `src/components/AssetViewer.test.tsx`

**Interfaces**

- Keep `AssetViewerProps` unchanged.
- Keep stable labels used by tests and assistive tech: `Share link`, `Download asset`, and `Close`.
- Keep `buildAssetUrl(beacon.assetUrl)` as the only download URL source.
- Keep `setModalOpen` and `setAssetPlaybackActive` behavior unchanged.

**Implementation**

- [ ] Import shared chrome and icons:

```tsx
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import IosShareIcon from '@mui/icons-material/IosShare';
import { CornerBrackets, HudIconButton } from './hud/FieldHudChrome';
```

- [ ] Add `CornerBrackets` inside the modal panel, keeping the existing constellation grid:

```tsx
<div
  ref={panelRef}
  className={`relative flex max-h-[88vh] w-[90vw] max-w-5xl origin-center flex-col border border-noesis-gold/40 bg-noesis-surface px-10 py-8 shadow-[0_0_40px_rgba(7,11,29,0.7)] ${panelTransform} ${panelMotion}`}
  role={Renderer ? 'dialog' : 'alertdialog'}
  aria-modal="true"
  aria-label={beacon.label}
  aria-describedby="viewer-summary"
>
  <CornerBrackets />
```

- [ ] Replace the asset header action glyphs with `HudIconButton`:

```tsx
<div className="flex shrink-0 items-center gap-2">
  <HudIconButton label="Share link" title="Copy link" onClick={handleShare}>
    <IosShareIcon fontSize="small" />
  </HudIconButton>
  <a
    href={downloadHref}
    download={beacon.label}
    className="grid h-10 w-10 place-items-center border border-noesis-gold/35 bg-noesis-void/70 text-noesis-parchment transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
    aria-label="Download asset"
    title="Download"
  >
    <DownloadIcon fontSize="small" />
  </a>
  <span className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-parchment/50 sm:inline">
    ESC | G
  </span>
  <HudIconButton label="Close" title="Close (ESC)" onClick={handleClose}>
    <CloseIcon fontSize="small" />
  </HudIconButton>
</div>
```

- [ ] Keep the scene-audio indicator but move it into a framed micro row:

```tsx
<span className="border border-noesis-gold/25 bg-noesis-void/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-noesis-parchment/50">
  {assetPlaybackActive ? 'media playing | scene audio low' : 'scene audio dimmed'}
</span>
```

- [ ] Update tests to keep these labels stable:

```tsx
expect(screen.getByLabelText('Share link')).toBeInTheDocument();
expect(screen.getByLabelText('Download asset')).toBeInTheDocument();
expect(screen.getByLabelText('Close')).toBeInTheDocument();
```

**Verification**

- [ ] Run `npm test -- src/components/AssetViewer.test.tsx`.
- [ ] Expected result: existing audio ducking and download tests still pass.
- [ ] Run `npm run typecheck`.
- [ ] Expected result: TypeScript exits 0.

**Commit**

- [ ] `git add src/components/AssetViewer.tsx src/components/AssetViewer.test.tsx`
- [ ] `git commit -m "fix: polish asset viewer chrome"`

## Task 5: Align Asset Renderer Loading And Error States

**Files**

- Modify `src/components/assetRenderers/renderers.tsx`

**Interfaces**

- Keep each renderer signature unchanged: `FC<BeaconRendererProps>`.
- Keep `ErrorBlock` internal to `renderers.tsx`.
- Keep media labels stable: `Audio: ${beacon.label}` and `Video: ${beacon.label}`.
- Keep retry behavior keyed by `reloadKey`.

**Implementation**

- [ ] Import `FieldSurface`:

```tsx
import { FieldSurface } from '../hud/FieldHudChrome';
```

- [ ] Replace the local `ErrorBlock` shell with the shared surface:

```tsx
const ErrorBlock: FC<ErrorBlockProps> = ({ url, onRetry }) => (
  <FieldSurface className="mx-auto max-w-[60ch] p-6">
    <p className="font-mono text-sm uppercase tracking-[0.24em] text-noesis-emerald">
      Failed to load asset
    </p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onRetry}
        className="border border-noesis-gold/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
      >
        Retry
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="border border-noesis-gold/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
      >
        Download
      </a>
    </div>
  </FieldSurface>
);
```

- [ ] Replace the audio viewer shell with a framed audio surface:

```tsx
return (
  <FieldSurface className="p-6">
    <h3 className="mb-4 font-display text-xl tracking-[0.08em] text-noesis-gold">
      {heading}
    </h3>
    {errored ? (
      <ErrorBlock url={url} onRetry={retry} />
    ) : (
      <audio
        key={reloadKey}
        controls
        src={url}
        className="w-full"
        preload="metadata"
        onError={() => setErrored(true)}
        aria-label={`Audio: ${beacon.label}`}
      />
    )}
  </FieldSurface>
);
```

- [ ] Apply the same principle to PDF fallback, video shell, JSON preview, and markdown metadata rows: framed surface, readable text, no raw translucent text over the panel grid.

**Verification**

- [ ] Run `npm test -- src/components/AssetViewer.test.tsx`.
- [ ] Expected result: asset media tests remain green.
- [ ] Run `npm run lint`.
- [ ] Expected result: ESLint exits 0.

**Commit**

- [ ] `git add src/components/assetRenderers/renderers.tsx`
- [ ] `git commit -m "fix: align asset renderer states with HUD chrome"`

## Task 6: Full Verification And Visual Smoke

**Files**

- No source edits unless verification exposes regressions.

**Interfaces**

- Verification commands are the public completion interface for this pass.
- Visual smoke validates the user-facing interface from the supplied screenshots.

**Commands**

- [ ] Run `npm run lint`.
  - Expected result: ESLint exits 0.
- [ ] Run `npm run typecheck`.
  - Expected result: TypeScript exits 0.
- [ ] Run `npm test`.
  - Expected result: Vitest exits 0 and reports all test files passing.
- [ ] Run `npm run build`.
  - Expected result: Vite exits 0 and prints a production build summary.

**Visual Smoke**

- [ ] Start the app with `npm run dev -- --host 127.0.0.1`.
- [ ] Open the Harshita field route used during prior debugging.
- [ ] Confirm the top-right surface shows email, sign out, audio dot, and does not collide with the action rail.
- [ ] Confirm the right action rail uses Noesis hairline buttons, not black rounded MUI defaults.
- [ ] Confirm bottom-center shortcut chips are readable over grass.
- [ ] Confirm bottom-right progress is readable over grass and includes progress text plus status dot/ring.
- [ ] Press `S`; confirm settings opens, shares the Noesis frame, and closes with `ESC`.
- [ ] Press `Q`; confirm quality changes through low, medium, high.
- [ ] Press `C`; confirm camera mode cycles.
- [ ] Press `M`; confirm the audio status changes without starting a second BGM source.
- [ ] Open an audio asset; confirm asset media controls display and scene-audio status reads `media playing | scene audio low` during playback.
- [ ] Force an asset load failure by temporarily using an invalid asset URL in a local test fixture; confirm the error surface shows `Failed to load asset`, `Retry`, and `Download` inside a Noesis frame. Revert the fixture before commit.

**Commit**

- [ ] `git status --short`
- [ ] If verification changes were required, commit them with `git commit -m "test: verify HUD asset polish"`.
- [ ] If no verification changes were required, leave the working tree clean after the final task commits.

## Completion Criteria

- [ ] `HUD.tsx` owns all desktop field overlay actions.
- [ ] `UI.tsx` no longer renders `SideBar` or `AudioButton` in the field overlay path.
- [ ] No legacy black rounded `SideBar` buttons appear in screenshots.
- [ ] The email/sign-out surface is readable and keyboard accessible.
- [ ] The progress and shortcut HUD surfaces stay readable over grass geometry.
- [ ] Settings, asset viewer, and asset error states use shared Noesis chrome.
- [ ] Asset media playback still ducks scene audio through the existing store path.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` all exit 0.
