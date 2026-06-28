import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BeaconAnnouncer from '../components/BeaconAnnouncer';
import type { Beacon } from '../types/world';

const beacon: Beacon = {
  id: 'b1',
  label: 'Test Beacon',
  summary: 'A test beacon',
  type: 'reading',
  position: { x: 0, z: 0 },
  assetUrl: 'https://example.com/asset',
};

describe('BeaconAnnouncer', () => {
  it('announces active beacon label', () => {
    render(<BeaconAnnouncer activeBeacon={beacon} />);
    expect(screen.getByRole('status')).toHaveTextContent('Test Beacon');
  });

  it('announces empty when no active beacon', () => {
    render(<BeaconAnnouncer activeBeacon={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
