import * as THREE from 'three/webgpu'
import { useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import {
    Fn,
    vec2,
    vec3,
    vec4,
    float,
    positionLocal,
    modelWorldMatrix,
    step,
    length,
    mix,
    fract,
    sin,
    dot,
    smoothstep,
} from 'three/tsl'
import { DEFAULT_GRASS_AREA_SIZE } from './grass/core/config'
import { getTerrainHeight } from '../core/shaders/terrainHelpers'
import { uTerrainAmp, uTerrainFreq, uTerrainSeed, uTerrainColor } from '../core/shaders/uniforms'
import { useGridSnapping } from '../core/utils/gridSnapping'

// TP2-002 Brand palette for terrain base color.
//   Parchment desaturated (#A89E88) is the dominant tone — replaces the
//   previous near-black/blue. Coherence-Emerald (#10B5A7) is sprinkled in
//   via a cheap hash speckle to suggest moss/coherent threads.
const PARCHMENT = vec3(0xA8 / 255, 0x9E / 255, 0x88 / 255)
const EMERALD = vec3(0x10 / 255, 0xB5 / 255, 0xA7 / 255)


export function Terrain({
    grassAreaSize = DEFAULT_GRASS_AREA_SIZE,
    cullCamera
}: {
    grassAreaSize?: number
    cullCamera?: THREE.PerspectiveCamera
}) {
    const { camera: defaultCamera } = useThree()
    const cameraToUse = cullCamera || defaultCamera
    
    const meshRef = useRef<THREE.Mesh>(null)
    
    // Use grid snapping hook
    useGridSnapping({
        camera: cameraToUse,
        grassAreaSize,
        onSnap: ({ snappedX, snappedZ }) => {
            if (meshRef.current) {
                meshRef.current.position.set(snappedX, 0, snappedZ)
                meshRef.current.updateMatrixWorld(true)
            }
        },
    })

    // Create material with terrain functions (uses global uniforms from core/shaders/uniforms)
    const material = useMemo(() => {
        const terrainHeight = getTerrainHeight(uTerrainAmp, uTerrainFreq, uTerrainSeed)

        const mat = new THREE.MeshBasicNodeMaterial()
        mat.side = THREE.DoubleSide

        // TP2-002: Parchment base with sparse emerald speckle.
        //   - Hash on world XZ gives a stable per-fragment pseudo-random.
        //   - smoothstep gates ~5% of fragments to receive emerald tint.
        //   - uTerrainColor defaults to black and is mixed in additively, so
        //     a non-black value in the debug panel still shifts the look.
        mat.colorNode = Fn(() => {
            const worldXZ = modelWorldMatrix.mul(vec4(positionLocal, float(1.0))).xz
            // Classic 2D hash (Brian Sharpe / GPU Gems style).
            const hash = fract(sin(dot(worldXZ, vec2(12.9898, 78.233))).mul(43758.5453))
            const speckle = smoothstep(float(0.95), float(0.985), hash)
            const base = mix(PARCHMENT, EMERALD, speckle.mul(0.45))
            // uTerrainColor defaults to (0,0,0).
            const tinted = base.add(uTerrainColor)
            return vec4(tinted, float(1.0))
        })()
        mat.alphaTest = 0.5

        mat.positionNode = Fn(() => {
            const localPos = positionLocal
            const worldPos = modelWorldMatrix.mul(vec4(localPos, float(1.0))).xyz
            const h = terrainHeight(worldPos.xz)
            const displacedPos = vec3(localPos.x as any, localPos.y as any, localPos.z.add(h) as any)
            return vec4(displacedPos, float(1.0))
        })()

        mat.opacityNode = Fn(() => {
            const dist = length(positionLocal.xy)
            const radius = float(grassAreaSize * 0.5)
            return float(1.0).sub(step(radius, dist))
        })()

        return mat
    }, [grassAreaSize])

    return (
        <group>
            {/* High segment count is needed for smooth FBM terrain to match grass density */}
            <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[grassAreaSize, grassAreaSize, 128, 128]} />
                <primitive object={material} />
            </mesh>
            {/* TP2-006: Sacred-Gold spawn marker ring at origin */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.4, 1.5, 64]} />
                <meshBasicMaterial color="#C5A017" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}
