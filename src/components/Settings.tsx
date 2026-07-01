import { useCallback, useEffect, useMemo } from 'react';
import { useGameStore, type Quality } from '../core/store/gameStore';
import { useAudioStore } from '../core/store/audioStore';
import CloseIcon from '@mui/icons-material/Close';
import { CornerBrackets, noesisSurfaceClass } from './hud/FieldHudChrome';

const APP_VERSION = '0.1.1 · Calliope';

const KEY_BINDINGS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'W A S D', label: 'Walk through the field' },
  { key: 'SHIFT', label: 'Run' },
  { key: 'G', label: 'Enter the active mirror' },
  { key: 'ESC', label: 'Close panel · resume' },
  { key: 'M', label: 'Mute · unmute audio' },
  { key: 'P', label: 'Pause · resume' },
  { key: 'H', label: 'Toggle help overlay' },
  { key: 'Q', label: 'Cycle quality (low / medium / high)' },
  { key: 'B', label: 'Toggle mini-map' },
  { key: 'F', label: 'Toggle FPS counter' },
  { key: 'V', label: 'Open visited beacons list' },
  { key: 'S', label: 'Open settings' },
  { key: 'SHIFT + R', label: 'Cycle reduced-motion preference' },
];

const labelClass =
  'flex items-center justify-between gap-4 font-sans text-xs uppercase tracking-[0.18em]';
const selectClass =
  'border border-noesis-gold/40 bg-noesis-void px-2 py-1 font-sans text-xs uppercase tracking-[0.16em] text-noesis-parchment focus:border-noesis-gold focus:outline-none';
const rangeClass = 'w-full accent-noesis-gold';
const muteButtonClass =
  'w-full border px-3 py-2 font-sans text-xs uppercase tracking-[0.25em] transition-colors';

/**
 * Settings — right-side slide-out drawer surfaced from the HUD via the `S`
 * key (or any control that flips `gameStore.settingsOpen`). Closes on the
 * × button, the close action, or ESC. Persists nothing locally — every
 * preference it writes lives in either gameStore (which has its own
 * partialize'd persist) or audioStore.
 */
export default function Settings() {
  const open = useGameStore((s) => s.settingsOpen);
  const setOpen = useGameStore((s) => s.setSettingsOpen);

  const quality = useGameStore((s) => s.quality);
  const setQuality = useGameStore((s) => s.setQuality);

  const reducedMotionPref = useGameStore((s) => s.reducedMotionPref);
  const setReducedMotionPref = useGameStore((s) => s.setReducedMotionPref);

  const genderPreference = useGameStore((s) => s.genderPreference);
  const setGenderPreference = useGameStore((s) => s.setGenderPreference);

  const masterVolume = useAudioStore((s) => s.masterVolume);
  const setMasterVolume = useAudioStore((s) => s.setMasterVolume);
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  // ESC closes the drawer when it's open. Uses capture-phase handling so it
  // wins over downstream listeners only when we're actually open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const onQualityChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setQuality(event.target.value as Quality);
    },
    [setQuality],
  );

  const onReducedMotionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const v = event.target.value;
      if (v === 'auto') setReducedMotionPref(null);
      else if (v === 'on') setReducedMotionPref(true);
      else setReducedMotionPref(false);
    },
    [setReducedMotionPref],
  );

  const onGenderChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setGenderPreference(event.target.value as 'auto' | 'male' | 'female');
    },
    [setGenderPreference],
  );

  const onVolume = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMasterVolume(Number(event.target.value));
    },
    [setMasterVolume],
  );

  const lastSync = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem('noesis_last_sync') ?? null;
    } catch {
      return null;
    }
  }, []);

  if (!open) return null;

  const reducedMotionValue =
    reducedMotionPref === null ? 'auto' : reducedMotionPref ? 'on' : 'off';

  return (
    <aside
      role="dialog"
      aria-label="Settings"
      data-noesis-hud-control="true"
      className={noesisSurfaceClass(
        'pointer-events-auto fixed top-0 right-0 z-50 h-full w-96 max-w-[92vw] overflow-y-auto border-l px-0 text-noesis-parchment',
      )}
    >
      <CornerBrackets />

      <div className="flex items-center justify-between border-b border-noesis-silver/30 px-8 py-4">
        <h2 className="font-display text-xl tracking-[0.4em] text-noesis-gold">
          SETTINGS
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close settings"
          className="grid h-9 w-9 place-items-center border border-noesis-gold/35 text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
        >
          <CloseIcon fontSize="small" />
        </button>
      </div>

      <div className="space-y-8 px-8 py-6">
        {/* Fix A — Avatar gender choice. 'Auto' uses WorldConfig.gender from
            the depth-reading report; explicit picks override. Persisted via
            gameStore. */}
        <section>
          <h3 className="mb-3 font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-noesis-gold/80">
            Profile
          </h3>
          <label className={labelClass}>
            <span className="text-noesis-parchment/70">Avatar</span>
            <select
              value={genderPreference}
              onChange={onGenderChange}
              className={selectClass}
            >
              <option value="auto">Auto (from report)</option>
              <option value="male">Male Plumber</option>
              <option value="female">Female Plumber</option>
            </select>
          </label>
        </section>

        {/* ===== Display ===== */}
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-gold/80">
            Display
          </h3>
          <label className={`mb-4 ${labelClass}`}>
            <span className="text-noesis-parchment/70">Quality</span>
            <select
              value={quality}
              onChange={onQualityChange}
              className={selectClass}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className={labelClass}>
            <span className="text-noesis-parchment/70">Reduced motion</span>
            <select
              value={reducedMotionValue}
              onChange={onReducedMotionChange}
              className={selectClass}
            >
              <option value="auto">Auto</option>
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>
        </section>

        {/* ===== Audio ===== */}
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-gold/80">
            Audio
          </h3>
          <label className="mb-4 block font-mono text-xs uppercase tracking-[0.2em]">
            <span className="mb-2 flex items-center justify-between text-noesis-parchment/70">
              <span>Master volume</span>
              <span className="text-noesis-gold">{Math.round(masterVolume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={onVolume}
              aria-label="Master volume"
              className={rangeClass}
            />
          </label>
          <button
            type="button"
            onClick={toggleMute}
            className={`${muteButtonClass} ${
              muted
                ? 'border-noesis-gold bg-noesis-gold/10 text-noesis-gold'
                : 'border-noesis-gold/40 text-noesis-parchment/70 hover:border-noesis-gold/60'
            }`}
            aria-pressed={muted}
          >
            {muted ? '[ MUTED ]' : '[ MUTE ]'}
          </button>
        </section>

        {/* ===== Keys ===== */}
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-gold/80">
            Keys
          </h3>
          <ul className="space-y-2">
            {KEY_BINDINGS.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.2em]"
              >
                <span className="border border-noesis-gold/40 bg-noesis-void/60 px-2 py-1 text-noesis-gold">
                  {row.key}
                </span>
                <span className="text-right text-noesis-parchment/70">
                  {row.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ===== About ===== */}
        <section>
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-noesis-gold/80">
            About
          </h3>
          <div className="flex items-center gap-4">
            <img
              src="/brand-logo.svg"
              alt="Tryambakam Noesis"
              className="h-10 w-10"
            />
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-noesis-parchment/60">
              <div>Tryambakam Noesis</div>
              <div>v{APP_VERSION}</div>
              <div>last sync · {lastSync ?? '—'}</div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}
