import { useCallback, useEffect, useRef } from 'react';
import type { Beacon } from '../types/world';
import { renderers } from './assetRenderers/registry';
import { useGameStore } from '../core/store/gameStore';

export interface AssetViewerProps {
  beacon: Beacon;
  onClose: () => void;
  reducedMotion: boolean;
}

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Sacred-Gold constellation grid: hair-thin lines at low opacity, 60×60 cell grid.
const CONSTELLATION_BG: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgba(212,175,55,0.25) 0, rgba(212,175,55,0.25) 0.5px, transparent 0.5px, transparent 60px), repeating-linear-gradient(90deg, rgba(212,175,55,0.25) 0, rgba(212,175,55,0.25) 0.5px, transparent 0.5px, transparent 60px)',
};

export default function AssetViewer({ beacon, onClose, reducedMotion }: AssetViewerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const Renderer = renderers[beacon.type];
  const setModalOpen = useGameStore((state) => state.setModalOpen);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setModalOpen(true);
    return () => {
      setModalOpen(false);
    };
  }, [setModalOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-noesis-void/80 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`relative bg-noesis-surface border border-noesis-gold/40 max-w-5xl w-[90vw] max-h-[88vh] flex flex-col py-8 px-10 ${
          reducedMotion ? '' : 'transition-opacity duration-200 ease-out'
        }`}
        role={Renderer ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-label={beacon.label}
      >
        {/* Sacred-Gold constellation grid backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={CONSTELLATION_BG}
        />

        {/* Header row */}
        <div className="relative flex items-start justify-between shrink-0 gap-6">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-noesis-gold tracking-wide truncate">
              {beacon.label}
            </h2>
            <p className="font-mono text-xs text-noesis-parchment/50 uppercase tracking-widest mt-1">
              {beacon.type}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="font-mono text-xs text-noesis-parchment/50 uppercase tracking-widest hidden sm:inline">
              [ ESC | G ]
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="font-display text-noesis-gold text-2xl leading-none hover:text-noesis-emerald focus:outline-none focus:ring-1 focus:ring-noesis-gold/60 px-2"
              aria-label="Close"
            >
              {'×'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto min-h-0 mt-6 relative">
          {Renderer ? (
            <Renderer beacon={beacon} />
          ) : (
            <p className="font-mono text-noesis-parchment/60">
              No viewer available for asset type &ldquo;{beacon.type}&rdquo;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
