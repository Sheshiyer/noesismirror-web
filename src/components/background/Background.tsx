// @ts-nocheck
import * as THREE from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { useMemo, useEffect, useRef, memo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  texture, equirectUV, uniform, mx_rotate3d, vec3, positionWorld,
  Fn, vec2, vec4, float, uv, length, smoothstep, sin, oneMinus, atan2
} from 'three/tsl'
import { useKTX2Texture } from '@core'
import { CameraMode, useGameStore } from '../../core/store/gameStore'
import { uTime } from '../../core/shaders/uniforms';

// TP2-005: North star - Sacred-Gold sprite directly above spawn
export function NorthStar() {
  const material = useMemo(() => {
    return new THREE.SpriteMaterial({
      color: new THREE.Color('#C5A017'),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 1,
    })
  }, [])

  return (
    <sprite position={[0, 60, 0]} scale={[0.8, 0.8, 0.8]}>
      <primitive object={material} attach="material" />
    </sprite>
  )
}

/**
 * TP2-007: Character aura (was: contact shadow).
 *
 * Shader-driven Coherence-Emerald aura emanating from an invisible torus
 * field around the avatar's feet. Replaces the previous flat disc with a
 * TSL fragment shader that:
 *   - Renders a radial torus profile (peak intensity at ~0.18 of plane radius,
 *     soft fade inward and outward)
 *   - Adds a subtle central bloom (always-present under-figure glow)
 *   - Modulates with a slow breath pulse (sine on uTime)
 *   - Adds a 6-fold rotational flow (circling-energy effect)
 *
 * Bioluminescent principle per brand guide: light originates from within the
 * figure's field, not projected onto it. Additive blend reads as a glow, not
 * an occluder. Subscribes to gameStore.characterRef and tracks each frame.
 */
export function CharacterShadow() {
  const meshRef = useRef<THREE.Mesh>(null)
  const characterRef = useGameStore((state) => state.characterRef)
  const tmpVec = useMemo(() => new THREE.Vector3(), [])

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })

    // Coherence-Emerald in linear-ish space — bright enough for additive blend
    mat.colorNode = vec3(0.12, 0.85, 0.78)

    mat.opacityNode = Fn(() => {
      // Distance from plane center (0..~0.5 inside the plane bounds)
      const d = length(uv().sub(vec2(0.5, 0.5)))

      // Torus-field profile — tightened: peak ring at d=0.28, fading sharply
      // outward by d=0.48. No central bloom (dropped — was overdriving the
      // additive blend against the dark grass canopy and reading as a flat
      // cyan disc). The aura is now a ring, not a halo.
      const ringInner = smoothstep(float(0.18), float(0.28), d)
      const ringOuter = oneMinus(smoothstep(float(0.28), float(0.48), d))
      const ring = ringInner.mul(ringOuter)

      // Breath pulse — slow sine on uTime, 0.9..1.0 amplitude
      const pulse = sin(uTime.mul(float(0.6))).mul(float(0.05)).add(float(0.95))

      // Rotational flow — 6-fold sine on polar angle, subtle
      const angle = atan2(uv().y.sub(float(0.5)), uv().x.sub(float(0.5)))
      const flow = sin(angle.mul(float(6.0)).add(uTime.mul(float(1.0)))).mul(float(0.06)).add(float(0.94))

      // Final intensity dropped from 0.7 → 0.32 so the additive blend
      // doesn't blow out against grass.
      return ring.mul(pulse).mul(flow).mul(float(0.32))
    })()

    return mat
  }, [])

  useFrame(() => {
    if (!meshRef.current || !characterRef?.current) return
    characterRef.current.getWorldPosition(tmpVec)
    // Sit just above ground; terrain displaces upward, so a small offset
    // keeps the aura from clipping into hills.
    meshRef.current.position.set(tmpVec.x, tmpVec.y + 0.03, tmpVec.z)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[2.4, 2.4, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export const Background = memo(function Background({ intensity, axis, speed }: { intensity: number, axis: [number, number, number], speed: number }) {
  const { scene } = useThree()

  const uniforms = useMemo(() => ({
    uIntensity: uniform(0.1),
    uSpeed: uniform(0.05),
    uAxis: uniform(vec3(0, 1, 0)),
  }), [])

  const cameraMode = useGameStore((state) => state.cameraMode);
  const map = useKTX2Texture({ map: '/textures/starmap_2020_4k.ktx2' }).map
  map.mapping = THREE.EquirectangularReflectionMapping
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping

  useEffect(() => {
    uniforms.uIntensity.value = cameraMode === CameraMode.FPV ? 1 : intensity
    uniforms.uAxis.value.set(axis[0], axis[1], axis[2]).normalize()
    uniforms.uSpeed.value = speed
  }, [cameraMode, intensity, axis, speed])

  useEffect(() => {
    if (map) {
      const dir = positionWorld.normalize()
      const angle = uTime.mul(uniforms.uSpeed)
      const rotatedDir = mx_rotate3d(dir, angle, uniforms.uAxis)
      const finalUVs = equirectUV(rotatedDir)

      const bgNode = texture(map, finalUVs).mul(uniforms.uIntensity)
      scene.backgroundNode = bgNode
    }
    return () => {
      scene.backgroundNode = null
    }
  }, [scene, map, uniforms])


  return null
})

