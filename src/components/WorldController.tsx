import { Suspense, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
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

export interface WorldControllerProps {
  config?: WorldConfig;
}

const WORLD_CONTENT = {
    enableEnv: true,
    enableRose: true,
    enableGrass: true,
    enableCharacter: true,
};

const SYSTEM_PARAMS = {
    timeScale: 1.0,
    globalHue: 0.0,
};

const WIND_PARAMS = {
    windDirX: 1,
    windDirZ: -0.8,
    windSpeed: uWindSpeed.value,
    windStrength: uWindStrength.value,
    windScale: uWindScale.value,
    windFacing: uWindFacing.value,
};

const TERRAIN_PARAMS = {
    amplitude: uTerrainAmp.value,
    frequency: uTerrainFreq.value,
    seed: uTerrainSeed.value,
    color: '#000000',
};

export function WorldController({ config }: WorldControllerProps) {
    const setActiveTargets = useGameStore((state) => state.setActiveTargets);
    const setComponentReady = useGameStore((state) => state.setComponentReady);

    const searchParams = new URLSearchParams(window.location.search);
    const debugMode = searchParams.get('debug') === 'true';
    const enableGrassDebug = debugMode && searchParams.get('grassDebug') === 'true';
    const { enableEnv, enableRose, enableGrass, enableCharacter } = WORLD_CONTENT;
    const { timeScale, globalHue } = SYSTEM_PARAMS;

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

    useEffect(() => {
        uWindDir.value.set(WIND_PARAMS.windDirX, WIND_PARAMS.windDirZ);
        uWindScale.value = WIND_PARAMS.windScale;
        uWindSpeed.value = WIND_PARAMS.windSpeed;
        uWindStrength.value = WIND_PARAMS.windStrength;
        uWindFacing.value = WIND_PARAMS.windFacing;
    }, []);

    useEffect(() => {
        uTerrainAmp.value = TERRAIN_PARAMS.amplitude;
        uTerrainFreq.value = TERRAIN_PARAMS.frequency;
        uTerrainSeed.value = TERRAIN_PARAMS.seed;
        const c = new THREE.Color(TERRAIN_PARAMS.color);
        uTerrainColor.value.set(c.r, c.g, c.b);
    }, []);

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
