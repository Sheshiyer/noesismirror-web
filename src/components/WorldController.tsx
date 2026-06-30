import { Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
// r3f-perf removed: it's WebGL-only (its store types `gl: THREE.WebGLRenderer`)
// and calling .render() against the WebGPU renderer crashes the world canvas
// mount with "Wb.render is not a function" / "k1.render is not a function".
// Same root cause as commit 77e94a9 (drei <Environment>). Use the browser's
// devtools Performance tab or `?debug=true` + eruda for inline metrics.
import * as THREE from 'three/webgpu';
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
import { CosmicSystem } from './cosmic/CosmicSystem';
import { Terrain } from './Terrain';
import { StarrySky } from './background/StarrySky';
import { useGameStore } from '../core/store/gameStore';
import { AsyncCompile } from '@core';
import Rose from './Rose/Rose';
import GrassWebGPU from './grass/GrassWebGPU';
import { Character } from './character';
import { GrassCullingDebug } from '../debug/GrassCullingDebug';
import { BeaconGarden } from './BeaconGarden';
import type { WorldConfig } from '../types/world';
import {
  WITNESS_VIOLET_HEX,
  FLOW_INDIGO_HEX,
  SACRED_GOLD_HEX,
  COHERENCE_EMERALD_HEX,
} from './beacon/sectionColors';

export interface WorldControllerProps {
  config?: WorldConfig;
}

export function WorldController({ config }: WorldControllerProps) {
    const setActiveTargets = useGameStore((state) => state.setActiveTargets);
    const setComponentReady = useGameStore((state) => state.setComponentReady);

    const debugMode = new URLSearchParams(window.location.search).get('debug') === 'true';

    // Enable eruda console only in debug mode (?debug=true)
    useEffect(() => {
        if (!debugMode) return;

        let cancelled = false;

        (async () => {
            try {
                const mod = await import('eruda');
                if (cancelled) return;
                const eruda: any = (mod as any).default ?? mod;
                if (typeof eruda.init === 'function') {
                    eruda.init();
                }
            } catch (e) {
                console.error('Failed to initialize eruda', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debugMode]);

    const { enableEnv, enableRose, enableGrass, enableCharacter, enableGrassDebug } = useControls('Game.Content', {
        enableEnv: { value: true, label: 'Environment' },
        enableCharacter: { value: true, label: '👤 Character' },
        enableRose: { value: true, label: '🌹 Rose Field' },
        enableGrass: { value: true, label: '🌿 Grass Field' },
        enableGrassDebug: { value: false, label: '🌿 Grass Culling Debug' },
    }, { collapsed: true });

    // Avatar gender preference (until proper Settings modal exists).
    // 'auto' uses WorldConfig.gender from the depth-reading report; explicit
    // overrides win. Persisted across sessions via gameStore.
    const genderPreference = useGameStore((s) => s.genderPreference);
    const setGenderPreference = useGameStore((s) => s.setGenderPreference);
    useControls('Game.Avatar', {
        gender: {
            value: genderPreference,
            options: { Auto: 'auto', Male: 'male', Female: 'female' } as const,
            label: '👤 Gender',
            onChange: (v: 'auto' | 'male' | 'female') => {
                if (v !== genderPreference) setGenderPreference(v);
            },
        },
    }, { collapsed: true });

    // Fix C — Proximity-tint preview. Lets you force a world tint without
    // walking up to a beacon. Auto = follow whichever beacon you're approaching
    // (Tier 1 behavior); the other options pin uGlowColor + uHueShift directly.
    const setCurrentBeaconColor = useGameStore((s) => s.setCurrentBeaconColor);
    useControls('Game.Tint', {
        force: {
            value: 'auto',
            options: {
                'Auto (proximity)': 'auto',
                'Sacred Gold': 'gold',
                'Witness Violet': 'violet',
                'Flow Indigo': 'indigo',
                'Coherence Emerald': 'emerald',
                'None (clear)': 'none',
            } as const,
            label: '🎨 Force tint',
            onChange: (v: string) => {
                // Helper to fake the hue shift the way sectionColors does.
                const HEX_MAP: Record<string, string> = {
                    gold: SACRED_GOLD_HEX,
                    violet: WITNESS_VIOLET_HEX,
                    indigo: FLOW_INDIGO_HEX,
                    emerald: COHERENCE_EMERALD_HEX,
                };
                if (v === 'auto') return; // BeaconGarden's proximity loop drives the store
                if (v === 'none') { setCurrentBeaconColor(null, 0); return; }
                const hex = HEX_MAP[v];
                if (!hex) return;
                // Quick HSL delta from natural rose hue (0.95) for the rose
                // material's HSV-shift pipeline. Matches sectionColors.ts logic.
                const c = new THREE.Color(hex);
                const hsl = { h: 0, s: 0, l: 0 };
                c.getHSL(hsl);
                let delta = hsl.h - 0.95;
                if (delta > 0.5) delta -= 1.0;
                if (delta < -0.5) delta += 1.0;
                setCurrentBeaconColor(hex, delta);
            },
        },
    }, { collapsed: true });

    // Fix F — Respawn-to-origin (R key). Teleports the character group back
    // to world origin. If the physics layer overrides (Rapier kinematic
    // controller), this only sticks for one frame — acceptable as escape hatch.
    const characterRef = useGameStore((s) => s.characterRef);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'r' && e.key !== 'R') return;
            // Don't fire inside text inputs / modals
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            const c = characterRef?.current;
            if (!c) return;
            c.position.set(0, 0, 0);
            c.updateMatrixWorld(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [characterRef]);

    // Fix D — Dev tooling toggles (transient, not persisted). GPU/CPU perf
    // overlay (r3f-perf) was removed — incompatible with three/webgpu.
    // For perf metrics, use browser devtools Performance tab or ?debug=true
    // + eruda.
    const showBeaconDebug = useGameStore((s) => s.showBeaconDebug);
    const setShowBeaconDebug = useGameStore((s) => s.setShowBeaconDebug);
    useControls('Game.Dev', {
        showBeaconDebug: {
            value: showBeaconDebug,
            label: '🔍 Beacon labels',
            onChange: (v: boolean) => { if (v !== showBeaconDebug) setShowBeaconDebug(v); },
        },
        respawnHint: { value: 'press R to teleport to origin', editable: false, label: '↻ Respawn' },
        perfHint: { value: 'devtools Performance tab (r3f-perf unsupported on WebGPU)', editable: false, label: '📊 GPU/CPU' },
    }, { collapsed: true });


    const { timeScale, globalHue } = useControls('Game.System', {
        timeScale: { value: 1.0, min: 0.0, max: 2.0, label: 'Game Speed' },
        globalHue: { value: 0.0, min: 0.0, max: 1.0, label: 'Global Hue' },
    });

    const [windParams] = useControls('Game.Wind', () => ({
        windDirX: { value: 1, min: -1, max: 1, step: 0.01 },
        windDirZ: { value: -0.8, min: -1, max: 1, step: 0.01 },
        windSpeed: { value: uWindSpeed.value, min: 0, max: 3, step: 0.01 },
        windStrength: { value: uWindStrength.value, min: 0, max: 10, step: 0.01 },
        windScale: { value: uWindScale.value, min: 0.01, max: 1, step: 0.01 },
        windFacing: { value: uWindFacing.value, min: 0.0, max: 1.0, step: 0.01 },
    }), { collapsed: true });

    const [terrainParams] = useControls('Game.Terrain', () => ({
        amplitude: { value: uTerrainAmp.value, min: 0.1, max: 3.0, step: 0.1 },
        frequency: { value: uTerrainFreq.value, min: 0.01, max: 0.1, step: 0.01 },
        seed: { value: uTerrainSeed.value, min: 0.0, max: 100.0, step: 0.1 },
        color: { value: '#000000' },
    }), { collapsed: true });

    useEffect(() => {
        uWindDir.value.set(windParams.windDirX, windParams.windDirZ);
        uWindScale.value = windParams.windScale;
        uWindSpeed.value = windParams.windSpeed;
        uWindStrength.value = windParams.windStrength;
        uWindFacing.value = windParams.windFacing;
    }, [windParams]);

    useEffect(() => {
        uTerrainAmp.value = terrainParams.amplitude;
        uTerrainFreq.value = terrainParams.frequency;
        uTerrainSeed.value = terrainParams.seed;
        const c = new THREE.Color(terrainParams.color);
        uTerrainColor.value.set(c.r, c.g, c.b);
    }, [terrainParams]);

    useEffect(() => {
        const targets: string[] = [];
        if (enableRose) targets.push('rose');
        if (enableGrass) targets.push('grass');
        if (enableCharacter) targets.push('character');
        setActiveTargets(targets);
    }, [enableRose, enableGrass, enableCharacter, setActiveTargets]);

    useFrame((_state, rawDelta) => {
        const delta = Math.min(rawDelta, 0.1);
        uGlobalHueShift.value = globalHue;

        uTime.value += delta * timeScale;
        uDeltaTime.value = delta * timeScale;
    });

    return <>
        {/* Environment - use group visibility to avoid remounting */}
        <Suspense fallback={null}>
            <group visible={enableEnv}>
                <StarrySky />
                <CosmicSystem />
                <Terrain />
            </group>

            {/* Major components - toggle visibility instead of unmounting */}
            <AsyncCompile id="rose" onReady={setComponentReady} debug={debugMode}>
                <Rose count={2000} visible={enableRose} />
            </AsyncCompile>

            <AsyncCompile id="grass" onReady={setComponentReady} debug={debugMode}>
                {enableGrassDebug && <GrassCullingDebug />}
                {!enableGrassDebug && <GrassWebGPU visible={enableGrass} />}
            </AsyncCompile>


            <AsyncCompile id="character" onReady={setComponentReady} debug={debugMode}>
                <Character position={[0, 0, 0]} scale={1} visible={enableCharacter} worldGender={config?.gender} />
            </AsyncCompile>

            {config && (
                <AsyncCompile id="beacons" onReady={setComponentReady} debug={debugMode}>
                    <BeaconGarden config={config} />
                </AsyncCompile>
            )}
        </Suspense>
    </>
}