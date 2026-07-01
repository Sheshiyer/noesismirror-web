import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Group } from 'three';
import { AudioListener } from 'three/webgpu';
import * as THREE from 'three/webgpu';

export enum CameraMode {
  Follow  = 0,
  FPV = 1,
  Detached = 2,
}

export type Quality = 'low' | 'medium' | 'high';

interface GameState {
  // ===== Camera State =====
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;

  // ===== Character State =====
  characterRef: React.MutableRefObject<Group | null> | null;
  setCharacterRef: (ref: React.MutableRefObject<Group | null> | null) => void;

  activeTargets: string[];
  setActiveTargets: (targets: string[]) => void;

  readyStatus: Record<string, boolean>;
  setComponentReady: (id: string, isReady: boolean) => void;

  isSceneReady: () => boolean;

  isGameStarted: boolean;
  setIsGameStarted: (loaded: boolean) => void;

  isSoundOn: boolean;
  setIsSoundOn: (isSoundOn: boolean) => void;

  audioListener: AudioListener | null;
  setAudioListener: (listener: THREE.AudioListener) => void;

  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;

  // ===== Quality / Display Prefs (extended for TP8 P1) =====
  // Quality is tri-state ('low' | 'medium' | 'high') — legacy 'high'/'low'
  // checks continue to work; new 'medium' surfaces in Settings + Q cycle.
  quality: Quality;
  setQuality: (q: Quality) => void;
  toggleQuality: () => void;

  // null = auto-detect via prefers-reduced-motion media query, true/false = explicit override.
  reducedMotionPref: boolean | null;
  setReducedMotionPref: (b: boolean | null) => void;

  showFps: boolean;
  toggleFps: () => void;

  miniMapOpen: boolean;
  toggleMiniMap: () => void;

  settingsOpen: boolean;
  setSettingsOpen: (b: boolean) => void;

  isControlEnabled: boolean;
  setControlEnabled: (enabled: boolean) => void;

  // ===== WebGPU State =====
  gpuError: string | null;
  setGpuError: (error: string | null) => void;

  // ===== Modal / Audio Ducking State =====
  modalOpen: boolean;
  assetPlaybackActive: boolean;
  duckAudio: number;
  setModalOpen: (open: boolean) => void;
  setAssetPlaybackActive: (active: boolean) => void;

  // ===== Onboarding State (TP7) =====
  onboardingPhase: OnboardingPhase;
  setOnboardingPhase: (p: OnboardingPhase) => void;

  // ===== HUD State (TP8) =====
  hudVisible: boolean;
  setHudVisible: (b: boolean) => void;

  // ===== Avatar Gender Preference =====
  // 'auto' = derive from WorldConfig.gender (which the depth-reading report
  // populates), 'male'/'female' = explicit override. Persists across sessions.
  genderPreference: 'auto' | 'male' | 'female';
  setGenderPreference: (p: 'auto' | 'male' | 'female') => void;

  // ===== Proximity-driven world tint =====
  // The hex color of the beacon the player is currently approaching, or null
  // when no beacon is in approach range. Rose petals (via uHueShift) and
  // CosmicBeam glows (via uGlowColor) lerp toward this value each frame so
  // the world's color register reflects which section the player is engaging.
  currentBeaconColorHex: string | null;
  // Pre-computed hue-shift delta toward the beacon color, for the Rose
  // material's existing HSV-shift pipeline. 0 = no shift (default).
  currentBeaconHueShift: number;
  setCurrentBeaconColor: (hex: string | null, hueShift: number) => void;

  // ===== Dev / debug toggles (transient, not persisted) =====
  // showPerf (r3f-perf) was removed — incompatible with three/webgpu renderer.
  showBeaconDebug: boolean;
  setShowBeaconDebug: (b: boolean) => void;
}

export type OnboardingPhase =
  | 'idle'
  | 'arriving'
  | 'walked'
  | 'first-approach'
  | 'first-open'
  | 'first-close'
  | 'completion';

// Read persisted onboarding completion flag once at module load.
// Browser-only — guarded for SSR / test environments without window.
const ONBOARDED_KEY = 'noesis_onboarded';
const initialOnboardingPhase: OnboardingPhase = (() => {
  if (typeof window === 'undefined') return 'arriving';
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === 'true'
      ? 'completion'
      : 'arriving';
  } catch {
    return 'arriving';
  }
})();

// Storage shim so persist hydration doesn't crash in test/SSR envs.
// Mirrors the pattern used by visitedStore + audioStore.
const memoryStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};
const safeStorage = () =>
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : memoryStorage;

const MODAL_DUCK_AUDIO = 0.15;
const MEDIA_DUCK_AUDIO = 0.03;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ===== Camera State =====
      cameraMode: CameraMode.Follow,
      setCameraMode: (mode) => set({ cameraMode: mode }),
      toggleCameraMode: () => set((state) => ({
        cameraMode: (state.cameraMode + 1) % 3
      })),

      // ===== Character State =====
      characterRef: null,
      setCharacterRef: (ref) => set({ characterRef: ref }),

      activeTargets: [],
      setActiveTargets: (targets) => set({ activeTargets: targets }),

      readyStatus: {},
      setComponentReady: (id, isReady) => set((state) => ({
        readyStatus: { ...state.readyStatus, [id]: isReady }
      })),

      isSceneReady: () => {
        const { activeTargets, readyStatus } = get();
        if (activeTargets.length === 0) return false;
        return activeTargets.every((target) => readyStatus[target] === true);
      },

      isGameStarted: false,
      setIsGameStarted: (loaded) => set({ isGameStarted: loaded }),

      isSoundOn: false,
      setIsSoundOn: (isSoundOn) => set({ isSoundOn: isSoundOn }),

      audioListener: null,
      setAudioListener: (listener) => set({ audioListener: listener }),

      isMobile: false,
      setIsMobile: (isMobile) => set({ isMobile: isMobile }),

      // ===== Quality / Display Prefs =====
      quality: 'high',
      setQuality: (q) => set({ quality: q }),
      // Legacy two-state toggle preserved — cycles between 'high' <-> 'low'.
      // New code should prefer setQuality. The Q-key cycle in HUD walks
      // through low → medium → high.
      toggleQuality: () => set((state) => ({
        quality: state.quality === 'high' ? 'low' : 'high'
      })),

      reducedMotionPref: null,
      setReducedMotionPref: (b) => set({ reducedMotionPref: b }),

      showFps: false,
      toggleFps: () => set((state) => ({ showFps: !state.showFps })),

      miniMapOpen: false,
      toggleMiniMap: () => set((state) => ({ miniMapOpen: !state.miniMapOpen })),

      settingsOpen: false,
      setSettingsOpen: (b) => set({ settingsOpen: b }),

      isControlEnabled: false,
      setControlEnabled: (enabled) => set({ isControlEnabled: enabled }),

      // ===== WebGPU State =====
      gpuError: null,
      setGpuError: (error) => set({ gpuError: error }),

      // ===== Modal / Audio Ducking State =====
      modalOpen: false,
      assetPlaybackActive: false,
      duckAudio: 1,
      setModalOpen: (open) => set((state) => ({
        modalOpen: open,
        assetPlaybackActive: open ? state.assetPlaybackActive : false,
        duckAudio: open
          ? state.assetPlaybackActive ? MEDIA_DUCK_AUDIO : MODAL_DUCK_AUDIO
          : 1,
      })),
      setAssetPlaybackActive: (active) => set((state) => ({
        assetPlaybackActive: active,
        duckAudio: state.modalOpen
          ? active ? MEDIA_DUCK_AUDIO : MODAL_DUCK_AUDIO
          : 1,
      })),

      // ===== Onboarding State (TP7) =====
      onboardingPhase: initialOnboardingPhase,
      setOnboardingPhase: (p) => set({ onboardingPhase: p }),

      // ===== HUD State (TP8) =====
      hudVisible: true,
      setHudVisible: (b) => set({ hudVisible: b }),

      // ===== Avatar Gender Preference =====
      genderPreference: 'auto',
      setGenderPreference: (p) => set({ genderPreference: p }),

      // ===== Proximity-driven world tint =====
      currentBeaconColorHex: null,
      currentBeaconHueShift: 0,
      setCurrentBeaconColor: (hex, hueShift) => set({
        currentBeaconColorHex: hex,
        currentBeaconHueShift: hueShift,
      }),

      // ===== Dev / debug toggles (transient) =====
      showBeaconDebug: false,
      setShowBeaconDebug: (b) => set({ showBeaconDebug: b }),
    }),
    {
      name: 'noesis_game_prefs',
      storage: createJSONStorage(safeStorage),
      // Only persist user preferences. Ephemeral runtime state (modalOpen,
      // duckAudio, audioListener, characterRef, ready status, etc.) must NOT
      // hydrate from storage — it has to start clean each mount.
      partialize: (state) => ({
        quality: state.quality,
        reducedMotionPref: state.reducedMotionPref,
        showFps: state.showFps,
        miniMapOpen: state.miniMapOpen,
        genderPreference: state.genderPreference,
      }),
    }
  )
);
