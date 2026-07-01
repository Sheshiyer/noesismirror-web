import { PerformanceMonitor, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import { useEffect, Suspense, useMemo, useState } from "react";
import { DirectionalLight } from "../components/DirectionalLight";
import { WebGPURenderer } from "three/webgpu";
import Effects from "../components/Effects/Effects";
import { useGameStore } from "../core/store/gameStore";
import { CameraViewControl } from "../components/camera/CameraViewControl";
import { AudioManager } from "@core";
import { DeviceDetector } from "../core/utils/DeviceDetector";
import { UI } from "../ui/UI";
import { preloadVATAssets } from "../components/Rose/core";
import { WorldController } from "../components/WorldController";
import { NorthStar, CharacterShadow } from "../components/background/Background";
import { HDREnvironment } from "../components/HDREnvironment";
import * as THREE from "three/webgpu";
import { BeamSceneContext } from "./BeamSceneContext";
import { KeyboardMapper } from "@core";
import { input, keyBindings } from "../core/input/controls";
import { useShortcut } from "@core/hooks/useShortcut";
import { AudioLoader } from 'three';
import { KTX2Preloader } from "@core";
import { ROSE_TEXTURES } from "../components/Rose/core/config";
import { BODY_TEXTURE_PATHS, DETAIL_TEXTURE_PATHS, MODEL_PATHS } from '../components/character/config';
import type { WorldConfig } from "../types/world";


useLoader.preload(AudioLoader,
    ['/audio/fs_grass1.mp3',
        '/audio/fs_grass2.mp3',
        '/audio/fs_grass3.mp3',
        '/audio/fs_grass4.mp3',
        '/audio/fs_grass5.mp3']);

useLoader.preload(AudioLoader, ['/audio/wave01.mp3']);

useGLTF.preload(MODEL_PATHS);

preloadVATAssets('/vat/Rose_meta.json');
preloadVATAssets('/vat/RoseLowPoly_meta.json');

export interface AppProps {
  config?: WorldConfig;
}

export default function App({ config }: AppProps) {
    const beamScene = useMemo(() => new THREE.Scene(), []);
    const [dpr, setDpr] = useState(1.5);
    // TP2-025: Pause R3F render loop when tab is hidden
    const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');

    const toggleCameraMode = useGameStore((state) => state.toggleCameraMode);
    const setGpuError = useGameStore((state) => state.setGpuError);
    const setAudioListener = useGameStore((state) => state.setAudioListener);
    const gpuError = useGameStore((state) => state.gpuError);

    // TP2-025: Pause RAF on tab hidden
    useEffect(() => {
        const onVis = () => setFrameloop(document.hidden ? 'never' : 'always');
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    // Check WebGPU support on mount
    useEffect(() => {
        const checkWebGPU = async () => {
            if (!navigator.gpu) {
                setGpuError("WEBGPU NOT SUPPORTED");
                console.error("WebGPU is not supported in this browser");
                return;
            }
            try {
                const adapter = await navigator.gpu.requestAdapter();
                if (!adapter) {
                    setGpuError("NO GPU ADAPTER FOUND");
                    console.error("No GPU adapter found");
                    return;
                }
                console.log('WebGPU initialized successfully');
                setGpuError(null); // Clear any previous errors
            } catch (e) {
                setGpuError("GPU INIT FAILED");
                console.error("WebGPU initialization failed:", e);
            }
        };
        checkWebGPU();
    }, [setGpuError]);

    useShortcut('c', () => {
        toggleCameraMode();
    });

    return <>
        {/* Keep legacy debug controls out of the production field runtime until
            the control panel stack is replaced with a React 19-safe path. */}
        <DeviceDetector />
        <UI />
        <KeyboardMapper input={input} keyMap={keyBindings} />


        {!gpuError && (
            <Canvas
                frameloop={frameloop}
                camera={{
                    fov: 45,
                    near: 0.1,
                    far: 200,
                    position: [20, 20, 30]
                }}
                gl={(canvas) => {
                    // TP2-027: Disable MSAA on low quality, keep on high.
                    const quality = useGameStore.getState().quality;
                    const renderer = new WebGPURenderer({
                        ...canvas as any,
                        powerPreference: "high-performance",
                        antialias: quality !== 'low',
                        alpha: true,
                    });
                    renderer.setClearColor('#000000');
                    renderer.autoClear = true;
                    // TP2-013: ACES Filmic tone mapping for cinematic falloff.
                    //   Replaces the default (Reinhard-like) curve so Sacred-
                    //   Gold highlights and Coherence-Emerald glows don't
                    //   clip to white. Exposure 1.1 lifts midtones slightly.
                    renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    renderer.toneMappingExposure = 1.1;
                    // renderer.inspector = new Inspector();
                    renderer.sortObjects = false;

                    return renderer.init().then(() => renderer);
                }}
                dpr={dpr}
            >
                <Suspense fallback={null}>
                    <KTX2Preloader paths={ROSE_TEXTURES} />
                    <KTX2Preloader paths={BODY_TEXTURE_PATHS} />
                    <KTX2Preloader paths={DETAIL_TEXTURE_PATHS} />
                </Suspense>

                <AudioManager onListenerCreated={setAudioListener} />

                <PerformanceMonitor
                    bounds={() => [28, 32]}
                    onFallback={() => setDpr(1)}
                    onChange={({ factor }) => {
                        const targetDpr = 1 + 1 * factor;
                        setDpr(targetDpr);
                        // console.log("factor", factor, "target DPR", targetDpr);
                    }}
                />

                <BeamSceneContext.Provider value={beamScene}>
                    <WorldController config={config} />

                    <Suspense fallback={null}>
                        <color attach="background" args={['#000000']} />
                        {/* TP2-003/009/012: Void-Black distance fog.
                             Linear falloff from 30 to 110 world units fades
                             the field boundary into darkness and merges with
                             the horizon halo. Chosen linear over exp2 so the
                             ~90u halo ring sits squarely inside the fade. */}
                        <fog attach="fog" args={['#070B1D', 30, 110]} />
                        <CameraViewControl />
                        <HDREnvironment
                            files="/textures/potsdamer_platz_1k_nb.hdr"
                            intensity={0.5}
                        />
                        <ambientLight intensity={0.3} color="#0E1428" />
                        <DirectionalLight />
                        {/* TP2-005: North star above spawn */}
                        <NorthStar />
                        {/* TP2-001: Coherence-Emerald horizon halo —
                            removed by request: the 86-94m ring was reading as
                            a hard world-boundary line. The starfield + grass
                            falloff already carry the horizon mood without it. */}
                        {/* <HorizonHalo /> */}
                        {/* TP2-007: Emerald contact shadow under character */}
                        <CharacterShadow />
                        <Effects />
                    </Suspense>
                </BeamSceneContext.Provider>
            </Canvas>
        )}
    </>
}
