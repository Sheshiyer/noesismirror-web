import { create } from 'zustand';
import { Group } from 'three';

export enum CameraMode {
  Follow = 0,
  FPV = 1,
  Detached = 2,
}

interface GameState {
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;

  characterRef: React.MutableRefObject<Group | null> | null;
  setCharacterRef: (ref: React.MutableRefObject<Group | null> | null) => void;

  isControlEnabled: boolean;
  setControlEnabled: (enabled: boolean) => void;

  gpuError: string | null;
  setGpuError: (error: string | null) => void;
}

export const useGameStore = create<GameState>((set) => ({
  cameraMode: CameraMode.Follow,
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () => set((state) => ({
    cameraMode: (state.cameraMode + 1) % 3
  })),

  characterRef: null,
  setCharacterRef: (ref) => set({ characterRef: ref }),

  isControlEnabled: false,
  setControlEnabled: (enabled) => set({ isControlEnabled: enabled }),

  gpuError: null,
  setGpuError: (error) => set({ gpuError: error }),
}));
