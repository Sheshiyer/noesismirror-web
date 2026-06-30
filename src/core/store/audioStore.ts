import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Storage shim so persist hydration doesn't crash in test/SSR envs.
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

// TP6 — global audio preference store.
// masterVolume + muted persist across sessions. audioContextStarted is ephemeral
// (a gate flag for the first-user-gesture activation rule).
interface AudioStore {
  masterVolume: number; // 0..1, default 0.7
  muted: boolean; // default false
  audioContextStarted: boolean; // tracks first-gesture activation, NOT persisted
  setMasterVolume: (v: number) => void;
  toggleMute: () => void;
  setMuted: (m: boolean) => void;
  setAudioContextStarted: (b: boolean) => void;
}

export const useAudioStore = create<AudioStore>()(
  persist(
    (set) => ({
      masterVolume: 0.7,
      muted: false,
      audioContextStarted: false,
      setMasterVolume: (v) =>
        set({ masterVolume: Math.max(0, Math.min(1, v)) }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setMuted: (m) => set({ muted: m }),
      setAudioContextStarted: (b) => set({ audioContextStarted: b }),
    }),
    {
      name: 'noesis_audio_prefs',
      storage: createJSONStorage(safeStorage),
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        muted: state.muted,
      }),
    }
  )
);
