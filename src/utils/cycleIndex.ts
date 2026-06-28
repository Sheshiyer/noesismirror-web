export function cycleIndex(current: number, length: number, direction: 1 | -1): number {
  if (length <= 0) return -1;
  return (current + direction + length) % length;
}
