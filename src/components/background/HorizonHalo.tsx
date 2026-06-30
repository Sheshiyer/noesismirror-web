import * as THREE from 'three'
import { useMemo } from 'react'

/**
 * TP2-001: Horizon halo.
 *
 * A large flat ring sitting at the world horizon (~90 unit radius). Uses
 * Coherence-Emerald (`#10B5A7`) with additive blending and low opacity so it
 * reads as a soft luminous band rather than geometry. Sits just above the
 * terrain plane to avoid z-fighting and rotates flat (XZ plane).
 */
export function HorizonHalo() {
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#10B5A7'),
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  }, [])

  return (
    <mesh
      position={[0, 0.05, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    >
      {/* inner radius 86, outer radius 94 — thin band at horizon */}
      <ringGeometry args={[86, 94, 96, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export default HorizonHalo
