import { useEffect } from 'react';
import type { Beacon } from '../types/world';
import { cycleIndex } from '../utils/cycleIndex';

export interface UseBeaconKeyboardOptions {
  beacons: Beacon[];
  activeBeaconId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  viewerOpen: boolean;
  onCloseViewer: () => void;
}

export function useBeaconKeyboard({
  beacons,
  activeBeaconId,
  onSelect,
  onOpen,
  viewerOpen,
  onCloseViewer,
}: UseBeaconKeyboardOptions): null {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (viewerOpen) {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCloseViewer();
        }
        return;
      }

      if (beacons.length === 0) return;

      const currentIndex = activeBeaconId
        ? beacons.findIndex((beacon) => beacon.id === activeBeaconId)
        : -1;
      const resolvedIndex = currentIndex === -1 ? 0 : currentIndex;

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        const nextBeacon = beacons[cycleIndex(resolvedIndex, beacons.length, 1)];
        onSelect(nextBeacon.id);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const previousBeacon = beacons[cycleIndex(resolvedIndex, beacons.length, -1)];
        onSelect(previousBeacon.id);
        return;
      }

      if (event.key === 'Enter' && activeBeaconId !== null) {
        event.preventDefault();
        onOpen(activeBeaconId);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [beacons, activeBeaconId, onSelect, onOpen, viewerOpen, onCloseViewer]);

  return null;
}
