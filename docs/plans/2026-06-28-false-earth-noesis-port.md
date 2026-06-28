# Noesis on False-Earth Base — Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current WebGL/Noesis 3D renderer with the `false-earth` WebGPU/R3F codebase, then port all existing Noesis features (person-specific worlds, beacon config packs, discovery panel, asset viewers, keyboard navigation, reduced-motion, HUD) on top of it.

**Architecture:**
- Fork `false-earth` into a dedicated worktree and prune everything Noesis does not need (roses, cosmic beams, audio, MUI sidebar, Leva debug UI).
- Keep false-earth's WebGPU renderer, procedural terrain, GPU grass, third-person character, camera rig, lighting, and input system.
- Overlay Noesis as a layer: routing (`/p/:personId`), `world-config.json` loader, beacon placement/proximity, glassmorphism UI panels, and asset viewer modal.
- Bridge false-earth's Zustand `gameStore` (character position) into Noesis hooks so beacon proximity and keyboard navigation work against the real avatar position.

**Tech Stack:**
- React 19 + TypeScript + Vite (inherited from false-earth)
- React Three Fiber 9 + Three.js WebGPU renderer + TSL
- Zustand (game state) + Tailwind CSS (Noesis UI) + `react-router-dom`
- Vitest + `@testing-library/react` + jsdom for tests

---

## Task 0: Bootstrap the false-earth worktree

**Files:**
- Create directory: `../noesismirror-web-falseearth`
- Modify: `.gitignore` in new worktree (add `/public/audio`, `/public/vat`, `/public/textures` if pruning later)

**Step 1: Create isolated worktree and seed it with false-earth**

Run from the current repo root:

```bash
git worktree add ../noesismirror-web-falseearth -b feat/false-earth-base
cd ../noesismirror-web-falseearth
git clone https://github.com/momentchan/false-earth.git /tmp/false-earth-src --depth 1
rsync -av --exclude='.git' --exclude='node_modules' /tmp/false-earth-src/ ./
```

Expected: all false-earth files copied into the worktree.

**Step 2: Install dependencies and verify false-earth runs**

```bash
npm install
npm run dev
```

Expected: dev server starts on `https://localhost:5173/` (HTTPS) and the WebGPU world loads. If WebGPU is unavailable in the test environment, use Chrome Canary or accept a GPU error screen for now; the code path is correct.

**Step 3: Initial commit**

```bash
git add -A
git commit -m "chore: seed false-earth base for Noesis port"
```

---

## Task 1: Prune non-Noesis features

**Files:**
- Delete: `src/components/Rose/`, `src/components/cosmic/`, `src/components/audio/`, `src/ui/`, `src/debug/`
- Modify: `src/components/WorldController.tsx`, `src/app/App.tsx`, `src/core/store/gameStore.ts`

**Step 1: Remove directories that are not needed for Phase 1/2 Noesis**

```bash
rm -rf src/components/Rose
rm -rf src/components/cosmic
rm -rf src/components/audio
rm -rf src/ui
rm -rf src/debug
```

**Step 2: Simplify `src/components/WorldController.tsx`**

Replace its contents with the minimal world composition:

```tsx
import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { Terrain } from './Terrain';
import { StarrySky } from './background/StarrySky';
import { useGameStore } from '../core/store/gameStore';
import GrassWebGPU from './grass/GrassWebGPU';
import { Character } from './character';
import {
    uTime,
    uDeltaTime,
    uGlobalHueShift,
    uWindDir,
    uWindScale,
    uWindSpeed,
    uWindStrength,
    uWindFacing,
    uTerrainAmp,
    uTerrainFreq,
    uTerrainSeed,
    uTerrainColor,
} from '../core/shaders/uniforms';

export function WorldController() {
    const setComponentReady = useGameStore((state) => state.setComponentReady);

    useFrame((_state, rawDelta) => {
        const delta = Math.min(rawDelta, 0.1);
        uTime.value += delta;
        uDeltaTime.value = delta;
    });

    return (
        <Suspense fallback={null}>
            <StarrySky />
            <Terrain />
            <GrassWebGPU visible={true} />
            <Character position={[0, 0, 0]} scale={1} visible={true} />
        </Suspense>
    );
}
```

**Step 3: Simplify `src/app/App.tsx`**

Remove Leva, DeviceDetector, UI, KeyboardMapper, AudioManager, KTX2 preloaders, environment, effects (for now), and WebGPU check boilerplate. Keep the Canvas with WebGPURenderer and `WorldController`.

```tsx
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { WebGPURenderer } from 'three/webgpu';
import { WorldController } from '../components/WorldController';

export const BeamSceneContext = THREE.createContext<THREE.Scene | null>(null);

export default function App() {
    const beamScene = useMemo(() => new THREE.Scene(), []);

    return (
        <Canvas
            camera={{ fov: 45, near: 0.1, far: 200, position: [20, 20, 30] }}
            gl={(canvas) => {
                const renderer = new WebGPURenderer({
                    ...(canvas as any),
                    powerPreference: 'high-performance',
                    antialias: true,
                    alpha: true,
                });
                renderer.setClearColor('#000000');
                return renderer.init().then(() => renderer);
            }}
            dpr={1.5}
        >
            <BeamSceneContext.Provider value={beamScene}>
                <color attach="background" args={['#000000']} />
                <WorldController />
            </BeamSceneContext.Provider>
        </Canvas>
    );
}
```

**Step 4: Trim `src/core/store/gameStore.ts`**

Remove audio, mobile, quality, activeTargets, readyStatus, isGameStarted, isSoundOn. Keep camera, character ref, control enabled, gpuError.

```ts
import { create } from 'zustand';
import { Group } from 'three';
import * as THREE from 'three/webgpu';

export enum CameraMode {
  Follow = 0,
  FPV = 1,
  Detached = 2,
}

interface GameState {
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  characterRef: React.MutableRefObject<Group | null> | null;
  setCharacterRef: (ref: React.MutableRefObject<Group | null> | null) => void;
  isControlEnabled: boolean;
  setControlEnabled: (enabled: boolean) => void;
  gpuError: string | null;
  setGpuError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  cameraMode: CameraMode.Follow,
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () => set((state) => ({ cameraMode: (state.cameraMode + 1) % 3 })),
  characterRef: null,
  setCharacterRef: (ref) => set({ characterRef: ref }),
  isControlEnabled: true,
  setControlEnabled: (enabled) => set({ isControlEnabled: enabled }),
  gpuError: null,
  setGpuError: (error) => set({ gpuError: error }),
}));
```

**Step 5: Remove unused imports/aliases**

Run `npm run lint` and fix any broken imports from the deleted folders. Also remove `@core` path alias references that pointed to deleted modules.

**Step 6: Verify and commit**

```bash
npm run dev
```

Expected: world loads with terrain, grass, character, no UI, no roses/beams.

```bash
git add -A
git commit -m "feat: prune false-earth to terrain + grass + character"
```

---

## Task 2: Add routing and world-config loading

**Files:**
- Create: `src/main.tsx`, `src/components/Home.tsx`, `src/components/WorldPage.tsx`, `src/hooks/useWorldConfig.ts`, `src/types/world.ts`, `src/utils/buildWorldConfig.ts`, `public/packs/harshita/world-config.json`
- Modify: `src/app/App.tsx`
- Install: `react-router-dom`, `vitest`, `@testing-library/react`, `jsdom` (dev deps in later task; for now just react-router-dom)

**Step 1: Install react-router-dom**

```bash
npm install react-router-dom
```

**Step 2: Create `src/types/world.ts`**

```ts
export type BeaconType = 'reading' | 'audio' | 'video' | 'slides' | 'study';

export interface Beacon {
  id: string;
  label: string;
  summary: string;
  type: BeaconType;
  position: { x: number; z: number };
  assetUrl: string;
}

export interface WorldConfig {
  personId: string;
  personName: string;
  beacons: Beacon[];
}
```

**Step 3: Create `src/utils/buildWorldConfig.ts`**

```ts
import type { BeaconType, WorldConfig } from '../types/world';

export function buildWorldConfig(personId: string, data: unknown): WorldConfig {
  const raw = data as Record<string, unknown>;
  return {
    personId,
    personName: String(raw.personName ?? personId),
    beacons: (raw.beacons as unknown[] ?? []).map((b, index) => {
      const beacon = b as Record<string, unknown>;
      return {
        id: String(beacon.id ?? `beacon-${index}`),
        label: String(beacon.label ?? 'Untitled'),
        summary: String(beacon.summary ?? ''),
        type: String(beacon.type ?? 'reading') as BeaconType,
        position: {
          x: Number((beacon.position as Record<string, number> | undefined)?.x ?? 0),
          z: Number((beacon.position as Record<string, number> | undefined)?.z ?? 0),
        },
        assetUrl: String(beacon.assetUrl ?? ''),
      };
    }),
  };
}
```

**Step 4: Create `src/hooks/useWorldConfig.ts`**

```ts
import { useEffect, useState } from 'react';
import type { WorldConfig } from '../types/world';
import { buildWorldConfig } from '../utils/buildWorldConfig';

export function useWorldConfig(personId: string | undefined) {
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!personId) {
      setLoading(false);
      return;
    }
    fetch(`/packs/${personId}/world-config.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setConfig(buildWorldConfig(personId, data)))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [personId]);

  return { config, loading, error };
}
```

**Step 5: Create `public/packs/harshita/world-config.json`**

```json
{
  "personName": "Harshita",
  "beacons": [
    {
      "id": "synthesis",
      "label": "Synthesis & Practices",
      "summary": "Integration themes and weekly witness practices.",
      "type": "study",
      "position": { "x": 5, "z": 5 },
      "assetUrl": "/packs/harshita/reports/study-guide.md"
    },
    {
      "id": "reading",
      "label": "Core Reading",
      "summary": "Foundational text for the witness path.",
      "type": "reading",
      "position": { "x": -5, "z": 8 },
      "assetUrl": "/packs/harshita/reports/reading.html"
    }
  ]
}
```

**Step 6: Create `src/components/Home.tsx`**

```tsx
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
      <h1 className="text-4xl font-light">noesismirror</h1>
      <p className="text-neutral-400">A private 3D memory palace for witness premium packs.</p>
      <Link to="/p/harshita" className="rounded border border-white/20 px-4 py-2 hover:bg-white/10">
        Enter Harshita's World
      </Link>
    </div>
  );
}
```

**Step 7: Create `src/components/WorldPage.tsx` (skeleton)**

```tsx
import { useParams } from 'react-router-dom';
import { useWorldConfig } from '../hooks/useWorldConfig';
import App from '../app/App';

export default function WorldPage() {
  const { personId } = useParams();
  const { config, loading, error } = useWorldConfig(personId);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-white">Loading world…</div>;
  }
  if (error || !config) {
    return <div className="flex h-screen items-center justify-center text-red-400">Failed to load world for {personId}.</div>;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <App config={config} />
    </div>
  );
}
```

**Step 8: Wire routing in `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Home from './components/Home';
import WorldPage from './components/WorldPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/p/:personId" element={<WorldPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
```

**Step 9: Update `index.html` root element id if needed**

False-earth's `index.html` likely has `<div id="root"></div>`. Verify. If not, change to `root`.

**Step 10: Update `src/app/App.tsx` to accept `config`**

```tsx
interface AppProps {
  config: WorldConfig;
}

export default function App({ config }: AppProps) { ... }
```

Pass `config` into `WorldController` via context or props.

**Step 11: Verify and commit**

```bash
npm run dev
```

Visit `/` and `/p/harshita`. Expected: Home loads, world loads, no errors.

```bash
git add -A
git commit -m "feat: add routing and world-config loading"
```

---

## Task 3: Add beacon placement and proximity

**Files:**
- Create: `src/components/BeaconGarden.tsx`, `src/hooks/useBeaconProximity.ts`, `src/components/Beacon.tsx`
- Modify: `src/components/WorldController.tsx`, `src/app/App.tsx`

**Step 1: Create `src/components/Beacon.tsx`**

Reuse/adapt the existing Noesis `Beacon` component for false-earth's coordinate scale. False-earth uses meters; beacons are small glowing pillars/markers.

```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import type { Beacon as BeaconType } from '../types/world';

interface BeaconProps {
  beacon: BeaconType;
  state: 'dormant' | 'approachable' | 'active';
}

export default function Beacon({ beacon, state }: BeaconProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const s = state === 'active' ? 1.4 : state === 'approachable' ? 1.1 : 1;
      const pulse = 1 + Math.sin(clock.elapsedTime * 3) * 0.05;
      meshRef.current.scale.setScalar(s * pulse);
    }
  });

  const color = state === 'active' ? '#34d399' : state === 'approachable' ? '#facc15' : '#52525b';

  return (
    <group position={[beacon.position.x, 0.5, beacon.position.z]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.1, 0.1, 1, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <pointLight color={color} intensity={state === 'dormant' ? 0 : 2} distance={4} />
    </group>
  );
}
```

**Step 2: Create `src/hooks/useBeaconProximity.ts`**

Port from existing Noesis, but read character position from `gameStore.characterRef` instead of a prop.

```ts
import { useMemo } from 'react';
import type { Beacon } from '../types/world';
import { useGameStore } from '../core/store/gameStore';

const APPROACH_DISTANCE = 6;
const ACTIVE_DISTANCE = 3;

export function useBeaconProximity(beacons: Beacon[]) {
  const characterRef = useGameStore((state) => state.characterRef);

  const characterPosition = useMemo(() => {
    const ref = characterRef?.current;
    if (!ref) return { x: 0, z: 0 };
    return { x: ref.position.x, z: ref.position.z };
  }, [characterRef, characterRef?.current?.position.x, characterRef?.current?.position.z]);

  const states = useMemo(() => {
    const map: Record<string, 'dormant' | 'approachable' | 'active'> = {};
    let activeId: string | null = null;
    beacons.forEach((beacon) => {
      const dx = beacon.position.x - characterPosition.x;
      const dz = beacon.position.z - characterPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < ACTIVE_DISTANCE) {
        map[beacon.id] = 'active';
        activeId = beacon.id;
      } else if (dist < APPROACH_DISTANCE) {
        map[beacon.id] = 'approachable';
      } else {
        map[beacon.id] = 'dormant';
      }
    });
    return { states, activeBeaconId: activeId };
  }, [beacons, characterPosition]);

  return states;
}
```

**Step 3: Create `src/components/BeaconGarden.tsx`**

```tsx
import type { WorldConfig } from '../types/world';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import Beacon from './Beacon';

export default function BeaconGarden({ config }: { config: WorldConfig }) {
  const { states } = useBeaconProximity(config.beacons);

  return (
    <>
      {config.beacons.map((beacon) => (
        <Beacon key={beacon.id} beacon={beacon} state={states[beacon.id] ?? 'dormant'} />
      ))}
    </>
  );
}
```

**Step 4: Wire beacons into `WorldController.tsx`**

```tsx
import { BeaconGarden } from './BeaconGarden';

interface WorldControllerProps {
  config: WorldConfig;
}

export function WorldController({ config }: WorldControllerProps) {
  ...
  return (
    <Suspense fallback={null}>
      <StarrySky />
      <Terrain />
      <GrassWebGPU visible={true} />
      <Character position={[0, 0, 0]} scale={1} visible={true} />
      <BeaconGarden config={config} />
    </Suspense>
  );
}
```

**Step 5: Ensure `Character` sets `characterRef` in gameStore**

Inspect `src/components/character/index.tsx` (or equivalent). If it does not set the ref, wrap it:

```tsx
import { useEffect, useRef } from 'react';
import { useGameStore } from '../../core/store/gameStore';
import { Character as BaseCharacter } from './Character';

export function Character(props: any) {
  const ref = useRef<THREE.Group>(null);
  const setCharacterRef = useGameStore((state) => state.setCharacterRef);

  useEffect(() => {
    setCharacterRef(ref as React.MutableRefObject<THREE.Group | null>);
  }, [setCharacterRef]);

  return <BaseCharacter ref={ref} {...props} />;
}
```

Adjust based on the actual `Character` component signature.

**Step 6: Verify and commit**

Walk the character near beacon positions (or teleport). Expected: beacon scales/pulses and changes color.

```bash
git add -A
git commit -m "feat: add beacon placement and proximity detection"
```

---

## Task 4: Add Tailwind and port Noesis UI overlay

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/index.css` (update), `src/components/DiscoveryPanel.tsx`, `src/components/AssetViewer.tsx`, `src/components/BeaconAnnouncer.tsx`, `src/components/assetRenderers/*`, `src/hooks/useReducedMotion.ts`, `src/hooks/useBeaconKeyboard.ts`, `src/utils/cycleIndex.ts`
- Modify: `src/components/WorldPage.tsx`
- Install: `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/forms` (optional)

**Step 1: Install Tailwind**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Configure Tailwind**

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  background: #000;
}
```

**Step 3: Port UI components from existing Noesis repo**

Copy these files (with any path adjustments):
- `src/components/DiscoveryPanel.tsx`
- `src/components/AssetViewer.tsx`
- `src/components/BeaconAnnouncer.tsx`
- `src/components/assetRenderers/index.tsx`
- `src/components/assetRenderers/registry.ts`
- `src/components/assetRenderers/renderers.tsx`
- `src/components/assetRenderers/types.ts`
- `src/hooks/useReducedMotion.ts`
- `src/hooks/useBeaconKeyboard.ts`
- `src/utils/cycleIndex.ts`

Update imports to use local types (`../types/world`) and remove any references to deleted Noesis world components.

**Step 4: Update `src/components/WorldPage.tsx` to overlay UI**

```tsx
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWorldConfig } from '../hooks/useWorldConfig';
import { useBeaconProximity } from '../hooks/useBeaconProximity';
import { useBeaconKeyboard } from '../hooks/useBeaconKeyboard';
import { useReducedMotion } from '../hooks/useReducedMotion';
import App from '../app/App';
import DiscoveryPanel from './DiscoveryPanel';
import AssetViewer from './AssetViewer';
import BeaconAnnouncer from './BeaconAnnouncer';

export default function WorldPage() {
  const { personId } = useParams();
  const { config, loading, error } = useWorldConfig(personId);
  const reducedMotion = useReducedMotion();
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { states, activeBeaconId } = useBeaconProximity({
    beacons: config?.beacons ?? [],
    position: { x: 0, z: 0 },
  });

  const displayBeaconId = selectedBeaconId ?? activeBeaconId;
  const displayBeacon = useMemo(
    () => config?.beacons.find((b) => b.id === displayBeaconId) ?? null,
    [config, displayBeaconId]
  );

  useBeaconKeyboard({
    beacons: config?.beacons ?? [],
    activeBeaconId: displayBeaconId,
    onSelect: setSelectedBeaconId,
    onOpen: (id) => {
      setSelectedBeaconId(id);
      setViewerOpen(true);
    },
    viewerOpen,
    onCloseViewer: () => setViewerOpen(false),
  });

  if (loading) return <div className="flex h-screen items-center justify-center text-white">Loading world…</div>;
  if (error || !config) return <div className="flex h-screen items-center justify-center text-red-400">Failed to load world for {personId}.</div>;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <App config={config} />
      <BeaconAnnouncer activeBeacon={displayBeacon} />
      {displayBeacon && (
        <DiscoveryPanel
          beacon={displayBeacon}
          state={states[displayBeacon.id] ?? 'dormant'}
          onOpen={() => setViewerOpen(true)}
          reducedMotion={reducedMotion}
        />
      )}
      {viewerOpen && displayBeacon && (
        <AssetViewer beacon={displayBeacon} onClose={() => setViewerOpen(false)} reducedMotion={reducedMotion} />
      )}
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-xs rounded-lg border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
        <h1 className="mb-2 text-xl font-light tracking-wide text-white">{config.personName}'s World</h1>
        <div className="space-y-2">
          {config.beacons.map((beacon) => (
            <div key={beacon.id} className="rounded border border-white/10 bg-white/5 p-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{beacon.label}</span>
                <span className={`rounded px-1.5 py-0 text-[10px] uppercase ${states[beacon.id] === 'active' ? 'bg-emerald-600' : states[beacon.id] === 'approachable' ? 'bg-yellow-600' : 'bg-neutral-700'} text-white`}>
                  {states[beacon.id] ?? 'dormant'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">{beacon.summary}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Verify and commit**

Walk to a beacon or press Enter to open viewer. Expected: DiscoveryPanel appears, clicking Open shows AssetViewer.

```bash
git add -A
git commit -m "feat: port Noesis UI overlay and asset viewers"
```

---

## Task 5: Port keyboard navigation and reduced-motion

**Files:**
- Already created in Task 4.
- Modify: `src/hooks/useBeaconKeyboard.ts` to integrate with false-earth input if needed.

**Step 1: Ensure keyboard events are captured at document level**

The existing `useBeaconKeyboard` likely attaches to `window`. Verify it does not conflict with false-earth's character movement (WASD). Arrow keys and Enter/Escape should be separate from movement.

If false-earth consumes all keyboard input, add a guard: only process beacon keys when `viewerOpen` or when no movement key is pressed. For now, keep it simple.

**Step 2: Add reduced-motion detection**

`useReducedMotion.ts` already reads `window.matchMedia('(prefers-reduced-motion: reduce)')`. Ensure it is used to disable panel/viewer transitions.

**Step 3: Verify and commit**

```bash
git add -A
git commit -m "feat: integrate beacon keyboard navigation and reduced-motion"
```

---

## Task 6: Add testing infrastructure and port tests

**Files:**
- Create: `vitest.config.ts`, `src/__tests__/setup.ts`, test files for hooks/components
- Modify: `package.json` scripts, `tsconfig.json` (if needed)
- Install: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@testing-library/user-event`

**Step 1: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

**Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

**Step 3: Create `src/__tests__/setup.ts`**

```ts
import '@testing-library/jest-dom';
```

**Step 4: Add scripts to `package.json`**

```json
"test": "vitest run",
"typecheck": "tsc --noEmit"
```

**Step 5: Port relevant tests from current Noesis repo**

Copy/adapt:
- `src/hooks/__tests__/useWorldConfig.test.ts`
- `src/hooks/__tests__/useReducedMotion.test.ts`
- `src/hooks/__tests__/useBeaconKeyboard.test.ts`
- `src/components/__tests__/DiscoveryPanel.test.tsx`
- `src/components/__tests__/AssetViewer.test.tsx`
- `src/components/__tests__/BeaconAnnouncer.test.tsx`
- `src/components/assetRenderers/__tests__/renderers.test.tsx`
- `src/utils/__tests__/buildWorldConfig.test.ts`

Update imports to use local paths. WebGPU/3D component tests are not required for this phase.

**Step 6: Run verification pipeline**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all pass.

**Step 7: Commit**

```bash
git add -A
git commit -m "test: add vitest and port Noesis unit tests"
```

---

## Task 7: Documentation, attribution, and final verification

**Files:**
- Create/modify: `README.md`, `ATTRIBUTION.md`

**Step 1: Add attribution**

Create `ATTRIBUTION.md`:

```markdown
# Attribution

This project builds on **False Earth** by Ming-Jyun Hung.

- Source: https://github.com/momentchan/false-earth
- Author website: https://mingjyunhung.com/
- License: MIT

Noesis-specific features (world-config packs, beacon discovery UI, asset viewers, keyboard navigation) are original work.
```

**Step 2: Update `README.md`**

Replace false-earth README with Noesis-specific README covering:
- What noesismirror is
- Tech stack
- How to run (`npm install`, `npm run dev`)
- How to add a person pack (`public/packs/<id>/world-config.json`)
- Attribution

**Step 3: Final verification**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

**Step 4: Commit and push**

```bash
git add -A
git commit -m "docs: add attribution and Noesis README"
git push origin feat/false-earth-base
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-06-28-false-earth-noesis-port.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** — Open a new session in the `../noesismirror-web-falseearth` worktree and use `superpowers:executing-plans` for batch execution with checkpoints.

**Which approach?**
