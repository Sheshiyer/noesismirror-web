/* eslint-disable */
// @ts-nocheck
import { useGameStore, CameraMode } from '../../core/store/gameStore';

export function useEffectsControls() {
  const cameraMode = useGameStore((state) => state.cameraMode);

  return {
    isHighQuality: true,
    cameraMode,
    smaa: false,
    bloom: {
      enabled: true,
      threshold: 0.35,
      strength: 0.3,
      radius: 0.5,
    },
    toneMapping: {
      enabled: true,
      exposure: 1.1,
    },
    dof: {
      enabled: true,
      autofocus: true,
      focusDistance: 1.3,
      focalLength: 25.0,
      bokehScale: 5,
    },
  };
}
