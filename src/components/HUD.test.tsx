import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HUD from './HUD';
import type { Beacon } from '../types/world';
import { CameraMode, useGameStore } from '../core/store/gameStore';
import { useAudioStore } from '../core/store/audioStore';
import { useVisitedStore } from '../core/store/visitedStore';

vi.mock('./Settings', () => ({
  default: () => null,
}));

const beacons: Beacon[] = [
  {
    id: 'beacon-1',
    label: 'First Mirror',
    summary: 'First reflection',
    type: 'reading',
    position: { x: 0, z: 0 },
    assetUrl: '/assets/first',
  },
  {
    id: 'beacon-2',
    label: 'Second Mirror',
    summary: 'Second reflection',
    type: 'audio',
    position: { x: 12, z: -6 },
    assetUrl: '/assets/second',
  },
  {
    id: 'beacon-3',
    label: 'Third Mirror',
    summary: 'Third reflection',
    type: 'video',
    position: { x: -18, z: 9 },
    assetUrl: '/assets/third',
  },
];

function installLocalStorage() {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, value),
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

function renderHud() {
  return render(
    <MemoryRouter>
      <HUD personId="traveler" personName="Traveler" beacons={beacons} />
    </MemoryRouter>,
  );
}

describe('HUD', () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    localStorage.setItem(
      'noesis_token',
      `header.${btoa(JSON.stringify({ email: 'traveler@noesis.test' }))}.sig`,
    );

    useGameStore.setState({
      hudVisible: true,
      isGameStarted: true,
      quality: 'high',
      cameraMode: CameraMode.Follow,
      settingsOpen: false,
      miniMapOpen: false,
      showFps: false,
      reducedMotionPref: null,
      characterRef: null,
    });
    useAudioStore.setState({
      muted: false,
      audioContextStarted: false,
      masterVolume: 0.7,
    });
    useVisitedStore.setState({
      visited: { traveler: ['beacon-1', 'beacon-2'] },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('renders the framed session surface with the active identity', () => {
    renderHud();

    expect(screen.getByLabelText('Session controls')).toBeInTheDocument();
    expect(screen.getByText('traveler@noesis.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.getByLabelText('Scene audio inactive')).toBeInTheDocument();
  });

  it('renders shared shortcut chips and observed progress', () => {
    renderHud();

    expect(screen.getByText('2 of 3 mirrors observed')).toBeInTheDocument();
    expect(screen.getByText('WASD')).toBeInTheDocument();
    expect(screen.getByText('SHIFT')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('ESC')).toBeInTheDocument();
  });

  it('updates the action rail labels as quality, camera, audio, and settings change', () => {
    renderHud();

    expect(screen.getByLabelText('Field actions')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Cycle quality: High quality'));
    expect(screen.getByLabelText('Cycle quality: Low quality')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('QUALITY: LOW');

    fireEvent.click(screen.getByLabelText('Third person camera'));
    expect(screen.getByLabelText('First person camera')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('First person camera'));
    expect(screen.getByLabelText('Detached camera')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Mute scene audio'));
    expect(screen.getByLabelText('Unmute scene audio')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Open settings'));
    expect(screen.getByLabelText('Open settings')).toHaveAttribute('aria-pressed', 'true');
  });
});
