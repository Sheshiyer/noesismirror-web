import { LoadingScreen } from './LoadingScreen';
import { TouchJoystick } from '../core/input/TouchJoystick';
import { input } from '../core/input/controls';
import { useGameStore } from '../core/store/gameStore';

export function UI() {
  const isMobile = useGameStore((state) => state.isMobile);
  const isControlEnabled = useGameStore((state) => state.isControlEnabled);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <LoadingScreen />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: isControlEnabled ? 1 : 0,
          visibility: isControlEnabled ? 'visible' : 'hidden',
          transition: `opacity 0.5s ease, visibility 0s linear ${isControlEnabled ? '0s' : '0.5s'}`,
        }}
      >
        {isMobile && (
          <TouchJoystick
            input={input}
            actions={{
              forward: 'MoveForward',
              backward: 'MoveBackward',
              left: 'RotateLeft',
              right: 'RotateRight',
              run: 'Run',
            }}
          />
        )}
      </div>
    </div>
  );
}
