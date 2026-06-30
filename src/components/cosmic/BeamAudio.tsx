import { useEffect, useRef } from 'react';
import { useOneShotAudio } from '@core/hooks/useOneShotAudio';
import { useGameStore } from '../../core/store/gameStore';
import { useAudioStore } from '../../core/store/audioStore';
import { useVisitedStore } from '../../core/store/visitedStore';
import { AudioListener } from 'three/webgpu';
import { gameEvents } from '../../core/events';
import * as THREE from 'three/webgpu';

// Tone helper — fires a single sine note with a short envelope on a shared
// AudioContext. We lazily build the context on first use and reuse it for all
// UI SFX (TP6-006/007/008). Respects masterVolume / muted / duckAudio per fire.
function makeUiTones() {
  let ctx: AudioContext | null = null;
  function getCtx(): AudioContext | null {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone(opts: {
    freq: number;
    when: number; // seconds from now
    duration: number; // seconds
    gain: number; // 0..1
  }) {
    const c = getCtx();
    if (!c) return;
    const { masterVolume, muted } = useAudioStore.getState();
    const duck = useGameStore.getState().duckAudio;
    const final = opts.gain * masterVolume * (muted ? 0 : 1) * duck;
    if (final <= 0.0001) return;

    const start = c.currentTime + opts.when;
    const stop = start + opts.duration;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = opts.freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(final, start + Math.min(0.02, opts.duration / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, stop);
    osc.connect(g).connect(c.destination);
    osc.start(start);
    osc.stop(stop + 0.02);
  }

  return { tone };
}

export function BeamAudio() {
  const listener = useGameStore((state) => state.audioListener);
  const { play } = useOneShotAudio(listener as AudioListener, ['/audio/wave01.mp3']);
  const uiTonesRef = useRef<ReturnType<typeof makeUiTones> | null>(null);
  if (!uiTonesRef.current) uiTonesRef.current = makeUiTones();

  // Existing beam:hit SFX.
  useEffect(() => {
    const onHit = (payload: { position: THREE.Vector3; radius: number }) => {
      // Read duckAudio + master volume + mute fresh each fire so we don't
      // re-subscribe per tick. TP6-005 — final volume folds in audioStore.
      const duck = useGameStore.getState().duckAudio;
      const { masterVolume, muted } = useAudioStore.getState();
      play({
        position: payload.position,
        volume: 0.5 * duck * masterVolume * (muted ? 0 : 1),
        detuneRange: 300,
        refDistance: 5,
        maxDistance: 60
      });
    };
    gameEvents.on('beam:hit', onHit);
    return () => gameEvents.off('beam:hit', onHit);
  }, [play]);

  // TP6-006 / TP6-007 — modal open/close arpeggios.
  useEffect(() => {
    let prev = useGameStore.getState().modalOpen;
    const unsub = useGameStore.subscribe((s) => {
      const next = s.modalOpen;
      if (next === prev) return;
      const tones = uiTonesRef.current;
      if (!tones) { prev = next; return; }
      if (next) {
        // Open: ascending root → 5th → octave (Coherence-Emerald arpeggio).
        // C5 root → G5 5th → C6 octave, 100ms apart, 250ms each.
        tones.tone({ freq: 523.25, when: 0, duration: 0.25, gain: 0.08 });
        tones.tone({ freq: 783.99, when: 0.1, duration: 0.25, gain: 0.08 });
        tones.tone({ freq: 1046.5, when: 0.2, duration: 0.3, gain: 0.08 });
      } else {
        // Close: descending 5th → root (G5 → C5), 150ms apart.
        tones.tone({ freq: 783.99, when: 0, duration: 0.22, gain: 0.07 });
        tones.tone({ freq: 523.25, when: 0.15, duration: 0.32, gain: 0.07 });
      }
      prev = next;
    });
    return () => unsub();
  }, []);

  // TP6-008 — beacon-visited SFX. Fires once per newly-added (personId, beaconId).
  useEffect(() => {
    // Snapshot known visited keys so we only fire on additions, not on init.
    const keyOf = (personId: string, beaconId: string) => `${personId}::${beaconId}`;
    const seen = new Set<string>();
    const initial = useVisitedStore.getState().visited;
    for (const [pid, ids] of Object.entries(initial)) {
      for (const id of ids) seen.add(keyOf(pid, id));
    }

    const unsub = useVisitedStore.subscribe((s) => {
      const tones = uiTonesRef.current;
      for (const [pid, ids] of Object.entries(s.visited)) {
        for (const id of ids) {
          const k = keyOf(pid, id);
          if (seen.has(k)) continue;
          seen.add(k);
          // Single sine 440 Hz for 400ms, soft envelope.
          tones?.tone({ freq: 440, when: 0, duration: 0.4, gain: 0.05 });
        }
      }
    });
    return () => unsub();
  }, []);

  return null;
}
