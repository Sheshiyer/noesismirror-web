import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBeaconKeyboard } from '../hooks/useBeaconKeyboard';
import type { Beacon } from '../types/world';

const beacons: Beacon[] = [
  { id: 'a', label: 'A', summary: '', type: 'reading', position: { x: 0, z: 0 }, assetUrl: '' },
  { id: 'b', label: 'B', summary: '', type: 'audio', position: { x: 1, z: 0 }, assetUrl: '' },
  { id: 'c', label: 'C', summary: '', type: 'video', position: { x: 2, z: 0 }, assetUrl: '' },
];

function dispatchKey(key: string, shiftKey = false) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey }));
}

describe('useBeaconKeyboard', () => {
  it('cycles forward with ArrowDown', () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useBeaconKeyboard({
        beacons,
        activeBeaconId: 'a',
        onSelect,
        onOpen: vi.fn(),
        viewerOpen: false,
        onCloseViewer: vi.fn(),
      })
    );
    dispatchKey('ArrowDown');
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('cycles backward with ArrowLeft', () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useBeaconKeyboard({
        beacons,
        activeBeaconId: 'a',
        onSelect,
        onOpen: vi.fn(),
        viewerOpen: false,
        onCloseViewer: vi.fn(),
      })
    );
    dispatchKey('ArrowLeft');
    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('opens viewer with Enter', () => {
    const onOpen = vi.fn();
    renderHook(() =>
      useBeaconKeyboard({
        beacons,
        activeBeaconId: 'b',
        onSelect: vi.fn(),
        onOpen,
        viewerOpen: false,
        onCloseViewer: vi.fn(),
      })
    );
    dispatchKey('Enter');
    expect(onOpen).toHaveBeenCalledWith('b');
  });

  it('closes viewer with Escape when open', () => {
    const onCloseViewer = vi.fn();
    renderHook(() =>
      useBeaconKeyboard({
        beacons,
        activeBeaconId: 'b',
        onSelect: vi.fn(),
        onOpen: vi.fn(),
        viewerOpen: true,
        onCloseViewer,
      })
    );
    dispatchKey('Escape');
    expect(onCloseViewer).toHaveBeenCalledTimes(1);
  });
});
