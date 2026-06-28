import { useEffect, useRef, useState } from 'react';
import type { Beacon } from '../types/world';

export interface BeaconAnnouncerProps {
  activeBeacon: Beacon | null;
}

export default function BeaconAnnouncer({ activeBeacon }: BeaconAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const previousIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextId = activeBeacon?.id ?? null;
    if (nextId !== previousIdRef.current) {
      setAnnouncement(activeBeacon?.label ?? '');
      previousIdRef.current = nextId;
    }
  }, [activeBeacon]);

  return (
    <div aria-live="polite" aria-atomic="true" role="status" className="sr-only">
      {announcement}
    </div>
  );
}
