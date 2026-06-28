import { WorldConfig } from "../types/world";
import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, Suspense, useMemo, createContext } from "react";
import { DirectionalLight } from "../components/DirectionalLight";
import { WebGPURenderer } from "three/webgpu";
import Effects from "../components/Effects/Effects";
import { useGameStore } from "../core/store/gameStore";
import { CameraViewControl } from "../components/camera/CameraViewControl";
import { WorldController } from "../components/WorldController";
import * as THREE from "three/webgpu";

export const BeamSceneContext = createContext<THREE.Scene | null>(null);

export interface AppProps {
  config: WorldConfig;
}

export default function App({ config }: AppProps) {
    const beamScene = useMemo(() => new THREE.Scene(), []);
    const setGpuError = useGameStore((state) => state.setGpuError);
    const gpuError = useGameStore((state) => state.gpuError);

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
                setGpuError(null);
            } catch (e) {
                setGpuError("GPU INIT FAILED");
                console.error("WebGPU initialization failed:", e);
            }
        };
        checkWebGPU();
    }, [setGpuError]);

    return (
        <>
            {!gpuError && (
                <Canvas
                    camera={{
                        fov: 45,
                        near: 0.1,
                        far: 200,
                        position: [20, 20, 30]
                    }}
                    gl={(canvas) => {
                        const renderer = new WebGPURenderer({
                            ...canvas as any,
                            powerPreference: "high-performance",
                            antialias: true,
                            alpha: true,
                        });
                        renderer.setClearColor('#000000');
                        renderer.autoClear = true;
                        renderer.sortObjects = false;
                        return renderer.init().then(() => renderer);
                    }}
                    dpr={1.5}
                >
                    <BeamSceneContext.Provider value={beamScene}>
                        <WorldController config={config} />
                        <Suspense fallback={null}>
                            <color attach="background" args={['#000000']} />
                            <CameraViewControl />
                            <Environment
                                files="/textures/potsdamer_platz_1k_nb.hdr"
                                environmentIntensity={0.5}
                            />
                            <DirectionalLight />
                            <Effects />
                        </Suspense>
                    </BeamSceneContext.Provider>
                </Canvas>
            )}
        </>
    );
}
