import { createContext } from 'react';
import * as THREE from 'three/webgpu';

export const BeamSceneContext = createContext<THREE.Scene | null>(null);
