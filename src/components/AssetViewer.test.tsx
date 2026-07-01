import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssetViewer from '../components/AssetViewer';
import type { Beacon } from '../types/world';
import { useGameStore } from '../core/store/gameStore';
import { useAudioStore } from '../core/store/audioStore';

const readingBeacon: Beacon = {
  id: 'b1',
  label: 'Reading Beacon',
  summary: 'A reading beacon',
  type: 'reading',
  position: { x: 0, z: 0 },
  assetUrl: 'https://example.com/page.html',
};

const unknownBeacon: Beacon = {
  ...readingBeacon,
  type: 'unknown' as Beacon['type'],
};

const audioBeacon: Beacon = {
  id: 'audio-1',
  label: 'Deep Dive Audio',
  summary: 'Comprehensive audio exploration',
  type: 'audio',
  position: { x: 0, z: 0 },
  assetUrl: '/api/assets/harshita/audio/deep-dive-long.mp3',
};

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

describe('AssetViewer', () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    useGameStore.setState({
      modalOpen: false,
      assetPlaybackActive: false,
      duckAudio: 1,
    });
    useAudioStore.setState({
      masterVolume: 0.7,
      muted: false,
      audioContextStarted: false,
    });
  });

  it('focuses close button on mount', () => {
    render(
      <AssetViewer beacon={readingBeacon} onClose={vi.fn()} reducedMotion={false} />
    );
    expect(document.activeElement).toBe(screen.getByLabelText('Close'));
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(
      <AssetViewer beacon={readingBeacon} onClose={onClose} reducedMotion={false} />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    // TP4-002 — onClose fires after the 200ms exit animation
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 500 });
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    render(
      <AssetViewer beacon={readingBeacon} onClose={onClose} reducedMotion={false} />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 500 });
  });

  it('renders fallback for unsupported beacon type', () => {
    render(
      <AssetViewer beacon={unknownBeacon} onClose={vi.fn()} reducedMotion={false} />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/no viewer available/i)).toBeInTheDocument();
  });

  it('deeply ducks scene audio while asset media plays', async () => {
    render(
      <AssetViewer beacon={audioBeacon} onClose={vi.fn()} reducedMotion />
    );

    const audio = screen.getByLabelText('Audio: Deep Dive Audio') as HTMLAudioElement;
    Object.defineProperty(audio, 'paused', { configurable: true, value: false });
    fireEvent.play(audio);

    await waitFor(() => {
      expect(useGameStore.getState().assetPlaybackActive).toBe(true);
      expect(useGameStore.getState().duckAudio).toBe(0.03);
    });
  });

  it('returns to modal ducking when asset media pauses', async () => {
    render(
      <AssetViewer beacon={audioBeacon} onClose={vi.fn()} reducedMotion />
    );

    const audio = screen.getByLabelText('Audio: Deep Dive Audio') as HTMLAudioElement;
    Object.defineProperty(audio, 'paused', { configurable: true, value: false });
    fireEvent.play(audio);
    await waitFor(() => expect(useGameStore.getState().duckAudio).toBe(0.03));

    Object.defineProperty(audio, 'paused', { configurable: true, value: true });
    fireEvent.pause(audio);

    await waitFor(() => {
      expect(useGameStore.getState().assetPlaybackActive).toBe(false);
      expect(useGameStore.getState().duckAudio).toBe(0.15);
    });
  });

  it('uses tokenized asset URLs for modal download links', () => {
    localStorage.setItem('noesis_token', 'test-token');

    render(
      <AssetViewer beacon={audioBeacon} onClose={vi.fn()} reducedMotion />
    );

    const download = screen.getByLabelText('Download asset') as HTMLAnchorElement;
    expect(download.href).toContain('/api/assets/harshita/audio/deep-dive-long.mp3');
    expect(download.href).toContain('token=test-token');
  });
});
