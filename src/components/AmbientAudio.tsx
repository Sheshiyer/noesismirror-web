import { useEffect, useRef } from 'react';
import { useAudioStore } from '../core/store/audioStore';
import { useGameStore } from '../core/store/gameStore';

// TP6-001 / TP6-002 / TP6-018 / TP6-019 — atmospheric ambient drone.
// Renders nothing; manages a Web Audio graph (3 detuned oscillators -> low-pass
// -> master gain) gated on the first user gesture. Suspends on visibility hidden,
// resumes on visible. Disposes on unmount.

interface AmbientNodes {
  ctx: AudioContext;
  master: GainNode;
  filter: BiquadFilterNode;
  oscillators: OscillatorNode[];
}

const BASE_GAIN = 0.08;

// Cinematic root cluster: C2 + G2 (perfect 5th) + C1 (octave below)
const FREQS = [65.41, 98.0, 32.7];

export default function AmbientAudio() {
  const nodesRef = useRef<AmbientNodes | null>(null);
  const setAudioContextStarted = useAudioStore(
    (s) => s.setAudioContextStarted
  );

  useEffect(() => {
    let disposed = false;

    const buildGraph = () => {
      if (nodesRef.current || disposed) return;

      const AudioCtxCtor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtxCtor) return;

      const ctx = new AudioCtxCtor();

      // Low-pass for cosmic muffle.
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      // Master gain — starts at 0, the per-frame poll lifts it to effective gain.
      const master = ctx.createGain();
      master.gain.value = 0;

      filter.connect(master);
      master.connect(ctx.destination);

      const oscillators: OscillatorNode[] = FREQS.map((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 2 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        // Slight detune per voice so the sum has slow movement.
        osc.detune.value = (i - 1) * 4;
        osc.connect(filter);
        osc.start();
        return osc;
      });

      nodesRef.current = { ctx, master, filter, oscillators };
      setAudioContextStarted(true);
    };

    const onGesture = () => {
      buildGraph();
      // Some browsers create the context in 'suspended' state until resume() is
      // called inside a user-gesture handler. Resume defensively.
      nodesRef.current?.ctx.resume().catch(() => undefined);
      window.removeEventListener('mousedown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };

    window.addEventListener('mousedown', onGesture);
    window.addEventListener('keydown', onGesture);
    window.addEventListener('touchstart', onGesture);

    // TP6-019 — pause/resume on visibility change.
    const onVisibility = () => {
      const nodes = nodesRef.current;
      if (!nodes) return;
      if (document.hidden) {
        nodes.ctx.suspend().catch(() => undefined);
      } else {
        nodes.ctx.resume().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Poll the stores once per animation frame and push the effective gain to the
    // master GainNode. Cheaper and more responsive than re-subscribing on every
    // state change (and avoids React re-renders for a render-null component).
    let raf = 0;
    const tick = () => {
      const nodes = nodesRef.current;
      if (nodes) {
        const { masterVolume, muted } = useAudioStore.getState();
        const duck = useGameStore.getState().duckAudio;
        const effective =
          masterVolume * (muted ? 0 : 1) * duck * BASE_GAIN;
        // Smoothly chase the target to avoid clicks.
        const now = nodes.ctx.currentTime;
        nodes.master.gain.setTargetAtTime(effective, now, 0.08);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('mousedown', onGesture);
      window.removeEventListener('keydown', onGesture);
      window.removeEventListener('touchstart', onGesture);
      document.removeEventListener('visibilitychange', onVisibility);

      const nodes = nodesRef.current;
      nodesRef.current = null;
      if (nodes) {
        nodes.oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {
            /* already stopped */
          }
          osc.disconnect();
        });
        nodes.filter.disconnect();
        nodes.master.disconnect();
        nodes.ctx.close().catch(() => undefined);
      }
    };
  }, [setAudioContextStarted]);

  return null;
}
