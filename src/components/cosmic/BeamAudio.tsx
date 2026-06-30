import { useEffect } from 'react';
import { useOneShotAudio } from '@core/hooks/useOneShotAudio';
import { useGameStore } from '../../core/store/gameStore';
import { useAudioStore } from '../../core/store/audioStore';
import { AudioListener } from 'three/webgpu';
import { gameEvents } from '../../core/events';
import * as THREE from 'three/webgpu';

export function BeamAudio() {
  const listener = useGameStore((state) => state.audioListener);
  const { play } = useOneShotAudio(listener as AudioListener, ['/audio/wave01.mp3']);

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

  return null;
}