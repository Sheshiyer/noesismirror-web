// @ts-nocheck
import * as THREE from 'three'
import { useMemo, useEffect, useRef, memo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { texture, equirectUV, uniform, mx_rotate3d, vec3, positionWorld } from 'three/tsl'
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
 * TP2-007: Character contact shadow.
 *
 * A small emerald disc that tracks the character's feet. Uses additive
 * blending so it reads as a soft glow rather than an occluder — Coherence-
 * Emerald is the player-presence color, so this also doubles as a "you are
 * here" beacon. Subscribes to gameStore.characterRef and updates each frame.
 */
export function CharacterShadow() {
  const meshRef = useRef<THREE.Mesh>(null)
  const characterRef = useGameStore((state) => state.characterRef)
  const tmpVec = useMemo(() => new THREE.Vector3(), [])

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#10B5A7'),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  }, [])

  useFrame(() => {
    if (!meshRef.current || !characterRef?.current) return
    characterRef.current.getWorldPosition(tmpVec)
    // Sit just above ground; terrain displaces upward, so a small offset
    // keeps the disc from clipping into hills.
    meshRef.current.position.set(tmpVec.x, tmpVec.y + 0.03, tmpVec.z)
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <circleGeometry args={[0.6, 32]} />
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

