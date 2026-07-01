import { useMemo } from 'react';
import { useGameStore, CameraMode } from '../../core/store/gameStore';

const EFFECTS_CONFIG = {
  smaa: {
    enabled: false,
  },
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
    [CameraMode.Follow]: {
      enabled: true,
      autofocus: true,
      focusDistance: 1.3,
      focalLength: 25.0,
      bokehScale: 5,
    },
    [CameraMode.Detached]: {
      enabled: true,
      autofocus: false,
      focusDistance: 5,
      focalLength: 10.0,
      bokehScale: 5,
    },
    [CameraMode.FPV]: {
      enabled: false,
      autofocus: false,
      focusDistance: 10,
      focalLength: 50.0,
      bokehScale: 3,
    },
  },
};

export function useEffectsControls() {
  const cameraMode = useGameStore((state) => state.cameraMode);
  const quality = useGameStore((state) => state.quality);
  const isHighQuality = quality === 'high';

  const dof = useMemo(() => {
    switch (cameraMode) {
      case CameraMode.FPV:
        return EFFECTS_CONFIG.dof[CameraMode.FPV];
      case CameraMode.Detached:
        return EFFECTS_CONFIG.dof[CameraMode.Detached];
      case CameraMode.Follow:
      default:
        return EFFECTS_CONFIG.dof[CameraMode.Follow];
    }
  }, [cameraMode]);

  return {
    isHighQuality,
    cameraMode,
    smaa: EFFECTS_CONFIG.smaa.enabled,
    bloom: EFFECTS_CONFIG.bloom,
    toneMapping: EFFECTS_CONFIG.toneMapping,
    dof,
  };
}
