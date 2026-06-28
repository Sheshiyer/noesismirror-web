import { describe, it, expect } from 'vitest';
import { cycleIndex } from './cycleIndex';

describe('cycleIndex', () => {
  it('cycles forward within bounds', () => {
    expect(cycleIndex(0, 3, 1)).toBe(1);
    expect(cycleIndex(1, 3, 1)).toBe(2);
  });

  it('wraps forward from last to first', () => {
    expect(cycleIndex(2, 3, 1)).toBe(0);
  });

  it('wraps backward from first to last', () => {
    expect(cycleIndex(0, 3, -1)).toBe(2);
  });

  it('cycles backward within bounds', () => {
    expect(cycleIndex(2, 3, -1)).toBe(1);
  });

  it('handles single-item arrays', () => {
    expect(cycleIndex(0, 1, 1)).toBe(0);
    expect(cycleIndex(0, 1, -1)).toBe(0);
  });
});
