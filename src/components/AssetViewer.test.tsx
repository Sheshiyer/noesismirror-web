import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssetViewer from '../components/AssetViewer';
import type { Beacon } from '../types/world';

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

describe('AssetViewer', () => {
  it('focuses close button on mount', () => {
    render(
      <AssetViewer beacon={readingBeacon} onClose={vi.fn()} reducedMotion={false} />
    );
    expect(document.activeElement).toBe(screen.getByLabelText('Close'));
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <AssetViewer beacon={readingBeacon} onClose={onClose} reducedMotion={false} />
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <AssetViewer beacon={readingBeacon} onClose={onClose} reducedMotion={false} />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders fallback for unsupported beacon type', () => {
    render(
      <AssetViewer beacon={unknownBeacon} onClose={vi.fn()} reducedMotion={false} />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/no viewer available/i)).toBeInTheDocument();
  });
});
