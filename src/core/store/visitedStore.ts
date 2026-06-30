import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Storage shim that no-ops when localStorage isn't available (test env, SSR).
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

// TP — per-person visited-beacon tracking. Persisted under
// `noesis_visited` in localStorage as { visited: { [personId]: string[] } }.
// Sets are serialized as arrays; the public API exposes a Set for callers.
interface VisitedState {
  visited: Record<string, string[]>; // personId -> array of beacon ids
  markVisited: (personId: string, beaconId: string) => void;
  isVisited: (personId: string, beaconId: string) => boolean;
  getVisited: (personId: string) => Set<string>;
}

export const useVisitedStore = create<VisitedState>()(
  persist(
    (set, get) => ({
      visited: {},
      markVisited: (personId, beaconId) =>
        set((s) => {
          const cur = new Set(s.visited[personId] ?? []);
          cur.add(beaconId);
          return { visited: { ...s.visited, [personId]: Array.from(cur) } };
        }),
      isVisited: (personId, beaconId) =>
        (get().visited[personId] ?? []).includes(beaconId),
      getVisited: (personId) => new Set(get().visited[personId] ?? []),
    }),
    {
      name: 'noesis_visited',
      storage: createJSONStorage(safeStorage),
    }
  )
);
