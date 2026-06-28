import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { uTime, uDeltaTime } from '../core/shaders/uniforms';
import { Terrain } from './Terrain';
import { StarrySky } from './background/StarrySky';
import GrassWebGPU from './grass/GrassWebGPU';
import { Character } from './character';

export function WorldController() {
    useFrame((_state, rawDelta) => {
        const delta = Math.min(rawDelta, 0.1);
        uTime.value += delta;
        uDeltaTime.value = delta;
    });

    return (
        <Suspense fallback={null}>
            <StarrySky />
            <Terrain />
            <GrassWebGPU />
            <Character position={[0, 0, 0]} scale={1} />
        </Suspense>
    );
}
