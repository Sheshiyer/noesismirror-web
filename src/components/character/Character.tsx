import { useRef, useEffect } from 'react';
import { Group } from 'three';
import * as THREE from 'three/webgpu';
import { CharacterProps } from './config';
import { useGameStore } from '../../core/store/gameStore';

export const Character = ({ position = [0, 0, 0], scale = 1, visible = true }: CharacterProps) => {
  const groupRef = useRef<Group>(null);
  const setCharacterRef = useGameStore((state) => state.setCharacterRef);

  useEffect(() => {
    setCharacterRef(groupRef);
    return () => setCharacterRef(null);
  }, [setCharacterRef]);

  return (
    <group ref={groupRef} position={position} scale={scale} visible={visible} dispose={null}>
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
        <meshStandardNodeMaterial color="#e0e0e0" />
      </mesh>
    </group>
  );
};
