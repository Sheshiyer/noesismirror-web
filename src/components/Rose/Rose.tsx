import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import { useGameStore } from "../../core/store/gameStore";
import { useRoseUniforms } from "./hooks/useRoseUniforms";
import { useRoseCompute } from "./hooks/useRoseCompute";
import { useRoseLODLoader } from "./hooks/useRoseLODLoader";
import { useFrame } from "@react-three/fiber";
import { RoseLOD } from "./RoseLOD";
import { DEFAULT_ROSE_LOD_CONFIG } from "./core/config";
import type { RoseLODConfig } from "./core/config";

import { gameEvents } from "../../core/events";

export default function Rose({ 
    count, 
    visible = true,
    lodConfig = DEFAULT_ROSE_LOD_CONFIG 
}: { 
    count: number; 
    visible?: boolean;
    lodConfig?: RoseLODConfig[];
}) {
    const characterRef = useGameStore((state) => state.characterRef)
    const characterPos = useMemo(() => new THREE.Vector3(), [])

    const { uniforms, config } = useRoseUniforms()
    const { lodBuffers, isLoading } = useRoseLODLoader(count, lodConfig)

    const { vatData, spawn } = useRoseCompute(count, lodBuffers, uniforms.compute)

    useFrame((_, delta) => {
        if (!characterRef?.current) return
        characterRef.current.getWorldPosition(characterPos)
        uniforms.mat.uCharacterWorldPos.value.copy(characterPos)
        uniforms.compute.uCharacterWorldPos.value.copy(characterPos)

        // Tier 1 — lerp uHueShift toward the currently-approached beacon's
        // pre-computed hue-shift delta. 200ms-tau smoothing so transitions
        // are sub-second but visible. Reads from gameStore via getState to
        // avoid re-subscribing every frame.
        const target = useGameStore.getState().currentBeaconHueShift
        const lerp = 1 - Math.exp(-delta / 0.2)
        const u = uniforms.mat.uHueShift
        if (u) u.value += (target - u.value) * lerp
    })

    useEffect(() => {
        // Roses bloom on beacon approach (area-of-interest reveal) rather than
        // on random beam:hit events under the astronaut's feet. Same spawn API,
        // same petal effect — only the trigger and location moved to beacons.
        const onApproach = ({ position, radius }: { position: THREE.Vector3, radius: number }) => {
            spawn(position, 256, radius);
        };
        gameEvents.on('beacon:approach', onApproach);
        return () => gameEvents.off('beacon:approach', onApproach);
    }, [spawn]);

    if (isLoading || !lodBuffers.length || !vatData) return null

    return (
        <group visible={visible}>
            {lodBuffers.map((lodBuffer, index) => (
                <RoseLOD
                    key={`rose-lod-${index}-${lodBuffer.minDistance}-${lodBuffer.maxDistance}`}
                    count={count}
                    lodBuffer={lodBuffer}
                    uniforms={uniforms.mat}
                    vatData={vatData}
                    config={config}
                />
            ))}
        </group>
    )
}