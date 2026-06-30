import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
        distance={20}
        reducedMotion={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders beacon info and the [G] glyph when active', () => {
    render(
      <DiscoveryPanel
        beacon={beacon}
        state="active"
        distance={2}
        reducedMotion={false}
      />
    );

    expect(screen.getByText('Test Beacon')).toBeInTheDocument();
    expect(screen.getByText('A test beacon')).toBeInTheDocument();
    expect(screen.getByText(/press G to enter/i)).toBeInTheDocument();
  });

  it('renders panel without [G] glyph when only approachable', () => {
    render(
      <DiscoveryPanel
        beacon={beacon}
        state="approachable"
        distance={5}
        reducedMotion={false}
      />
    );

    expect(screen.getByText('Test Beacon')).toBeInTheDocument();
    expect(screen.queryByText(/press G to enter/i)).not.toBeInTheDocument();
  });
});
