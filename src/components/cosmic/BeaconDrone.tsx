import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { Beacon, BeaconType } from '../../types/world';
import { useGameStore } from '../../core/store/gameStore';
import { useAudioStore } from '../../core/store/audioStore';
import { useVisitedStore } from '../../core/store/visitedStore';

// WE-2 / TP6 — per-beacon ambient drone audio.
// Renders nothing; owns a Web Audio graph (2 oscillators + gain) that breathes
// in/out with character proximity and respects mute/master/duck.

interface BeaconDroneProps {
  beacon: Beacon;
  personId: string;
}

// Two-note dyads per beacon type. Chosen to feel distinct but blend into the
// ambient bed (brand-aligned: contemplative, low harmonic density).
const DRONE_FREQUENCIES: Record<BeaconType, [number, number]> = {
  audio: [220, 277], // A3 + C#4
  video: [330, 415], // E4 + G#4
  reading: [174, 220], // F3 + A3 — thinner
  slides: [261, 392], // C4 + G4 — harmonic
  study: [196, 247], // G3 + B3 — contemplative
};

// Distance window: silence at ≥30u, peak (0.15) at ≤6u.
const SILENT_DISTANCE = 30;
const PEAK_DISTANCE = 6;
const PEAK_GAIN = 0.15;

export function BeaconDrone({ beacon, personId }: BeaconDroneProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const visibleRef = useRef(true);

  useEffect(() => {
    // Lazily construct AudioContext on mount. Some browsers require a user
    // gesture; the resume() call below is safe to call repeatedly.
    let ctx: AudioContext;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    } catch {
      return;
    }
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const [f1, f2] = DRONE_FREQUENCIES[beacon.type] ?? [220, 277];

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = f1;
    osc1.connect(masterGain);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = f2;
    // Slight detune for a subtle beating texture.
    osc2.detune.value = 3;
    osc2.connect(masterGain);
    osc2.start();

    oscillatorsRef.current = [osc1, osc2];

    // Suspend audio context when tab is hidden — be a polite neighbour.
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (!ctxRef.current) return;
      if (document.visibilityState === 'hidden') {
        ctxRef.current.suspend().catch(() => {});
      } else {
        ctxRef.current.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      try {
        oscillatorsRef.current.forEach((o) => {
          try { o.stop(); } catch { /* already stopped */ }
          try { o.disconnect(); } catch { /* already disconnected */ }
        });
        masterGain.disconnect();
        ctx.close().catch(() => {});
      } catch {
        // best-effort teardown
      }
      ctxRef.current = null;
      masterGainRef.current = null;
      oscillatorsRef.current = [];
    };
  }, [beacon.type]);

  useFrame(() => {
    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;
    if (!visibleRef.current) return;

    const characterRef = useGameStore.getState().characterRef;
    const character = characterRef?.current as Group | null;
    if (!character) {
      masterGain.gain.value = 0;
      return;
    }

    // Distance in XZ-plane (matches useBeaconProximity).
    const dx = beacon.position.x - character.position.x;
    const dz = beacon.position.z - character.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    let proximity = 0;
    if (distance <= PEAK_DISTANCE) {
      proximity = PEAK_GAIN;
    } else if (distance < SILENT_DISTANCE) {
      // Linear lerp from PEAK_GAIN at PEAK_DISTANCE down to 0 at SILENT_DISTANCE.
      const t = 1 - (distance - PEAK_DISTANCE) / (SILENT_DISTANCE - PEAK_DISTANCE);
      proximity = PEAK_GAIN * t;
    }

    const { masterVolume, muted } = useAudioStore.getState();
    const duck = useGameStore.getState().duckAudio;
    const visited = useVisitedStore.getState().isVisited(personId, beacon.id);
    const visitedAttenuation = visited ? 0.5 : 1; // TP6-017

    const target = proximity * masterVolume * (muted ? 0 : 1) * duck * visitedAttenuation;

    // Smooth ramp to target — avoid clicks at distance threshold crossings.
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setTargetAtTime(target, now, 0.1);
  });

  return null;
}
