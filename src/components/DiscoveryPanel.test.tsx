import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscoveryPanel from '../components/DiscoveryPanel';
import type { Beacon } from '../types/world';

const beacon: Beacon = {
  id: 'b1',
  label: 'Test Beacon',
  summary: 'A test beacon',
  type: 'reading',
  position: { x: 0, z: 0 },
  assetUrl: 'https://example.com/asset',
};

describe('DiscoveryPanel', () => {
  it('renders nothing when dormant', () => {
    const { container } = render(
      <DiscoveryPanel
        beacon={beacon}
        state="dormant"
        onOpen={vi.fn()}
        reducedMotion={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders beacon info and calls onOpen', () => {
    const onOpen = vi.fn();
    render(
      <DiscoveryPanel
        beacon={beacon}
        state="active"
        onOpen={onOpen}
        reducedMotion={false}
      />
    );

    expect(screen.getByText('Test Beacon')).toBeInTheDocument();
    expect(screen.getByText('A test beacon')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
