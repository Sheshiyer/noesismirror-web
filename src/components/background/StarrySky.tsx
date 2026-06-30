import { useControls } from 'leva'
import { Background } from './Background'
import { Stars } from './Stars'

export function StarrySky() {
    const control = useControls('StarrySky', {
        // raised from 0.1 default — was crushing the starmap into a flat gradient (visible 2026-06-30 audit)
        intensity: { value: 0.55, min: 0.3, max: 1, step: 0.01 },
        axis: { value: [0.2, 1, 0] },
        speed: { value: 1.5, min: 0, max: 5, step: 0.01 },
    }, { collapsed: true })

    return (
        <group>
            <Stars speed={control.speed} axis={control.axis} />
            <Background intensity={control.intensity} axis={control.axis} speed={control.speed} />
        </group>
    )
}