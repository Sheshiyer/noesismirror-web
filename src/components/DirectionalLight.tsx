import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function DirectionalLight() {
    const directionalLightRef = useRef<THREE.DirectionalLight>(null)
    const helperRef = useRef<THREE.DirectionalLightHelper | null>(null)
    const { scene } = useThree()

    const rotationSpeed = 0.5
    const color = '#ffffff'
    const intensity = 2.0
    const debug = false

    const basePosition = useMemo(() => new THREE.Vector3(0, 2, 5), [])
    const positionRef = useRef(new THREE.Vector3())
    const rotationMatrixRef = useRef(new THREE.Matrix4())

    useEffect(() => {
        if (!directionalLightRef.current) return

        if (debug && !helperRef.current) {
            const helper = new THREE.DirectionalLightHelper(directionalLightRef.current, 1, 'red')
            helperRef.current = helper
            scene.add(helper)
        } else if (!debug && helperRef.current) {
            scene.remove(helperRef.current)
            helperRef.current.dispose()
            helperRef.current = null
        }

        return () => {
            if (helperRef.current) {
                scene.remove(helperRef.current)
                helperRef.current.dispose()
                helperRef.current = null
            }
        }
    }, [debug, scene])

    useEffect(() => {
        if (!directionalLightRef.current) return

        const light = directionalLightRef.current
        light.color.set(color)
        light.intensity = intensity
    }, [color, intensity])

    useFrame((state) => {
        if (!directionalLightRef.current) return

        const rotationY = state.clock.elapsedTime * rotationSpeed
        positionRef.current.copy(basePosition)
        rotationMatrixRef.current.makeRotationY(rotationY)
        positionRef.current.applyMatrix4(rotationMatrixRef.current)
        directionalLightRef.current.position.copy(positionRef.current)

        if (helperRef.current) {
            helperRef.current.update()
        }
    })

    return (
        <directionalLight ref={directionalLightRef} position={basePosition.toArray()} intensity={1.0} />
    )
}
