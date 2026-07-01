import { Background } from './Background'
import { Stars } from './Stars'

const STARRY_SKY_CONFIG = {
    intensity: 0.55,
    axis: [0.2, 1, 0] as [number, number, number],
    speed: 1.5,
};

export function StarrySky() {
    return (
        <group>
            <Stars speed={STARRY_SKY_CONFIG.speed} axis={STARRY_SKY_CONFIG.axis} />
            <Background
                intensity={STARRY_SKY_CONFIG.intensity}
                axis={STARRY_SKY_CONFIG.axis}
                speed={STARRY_SKY_CONFIG.speed}
            />
        </group>
    )
}
