const POSITION_UTILITY_RE = /\b(?:absolute|fixed|relative|sticky)\b/;

export const noesisSurfaceClass = (extra = ''): string => {
  const position = POSITION_UTILITY_RE.test(extra) ? '' : 'relative';
  return `${position} border border-noesis-gold/35 bg-noesis-void/75 text-noesis-parchment shadow-[0_0_30px_rgba(7,11,29,0.55)] backdrop-blur-md ${extra}`.trim();
};
