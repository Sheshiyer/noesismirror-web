import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  FieldSurface,
  HudIconButton,
  HudKeyChip,
  ObservedProgress,
  noesisSurfaceClass,
} from './FieldHudChrome';

describe('FieldHudChrome', () => {
  it('renders framed HUD surfaces with accessible labels', () => {
    render(<FieldSurface ariaLabel="Session controls">content</FieldSurface>);
    expect(screen.getByLabelText('Session controls')).toHaveClass('border-noesis-gold/35');
  });

  it('does not override caller positioning utilities', () => {
    expect(noesisSurfaceClass('absolute top-4 right-4')).toContain('absolute');
    expect(noesisSurfaceClass('absolute top-4 right-4')).not.toMatch(/\brelative\b/);
    expect(noesisSurfaceClass('p-4')).toMatch(/\brelative\b/);
  });

  it('renders HUD icon buttons with labels and pressed state', () => {
    render(
      <HudIconButton label="Open settings" pressed onClick={vi.fn()}>
        S
      </HudIconButton>,
    );
    expect(screen.getByLabelText('Open settings')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders readable key chips', () => {
    render(<HudKeyChip>WASD</HudKeyChip>);
    expect(screen.getByText('WASD')).toHaveClass('bg-noesis-void/80');
  });

  it('renders observed progress text and percent label', () => {
    render(
      <ObservedProgress
        observed={2}
        total={10}
        healthLabel="Connection healthy"
        healthTone="emerald"
      />,
    );
    expect(screen.getByText('2 of 10 mirrors observed')).toBeInTheDocument();
    expect(screen.getByLabelText('20% observed')).toBeInTheDocument();
  });
});
