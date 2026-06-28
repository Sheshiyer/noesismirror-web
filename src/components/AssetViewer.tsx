import { useCallback, useEffect, useRef } from 'react';
import type { Beacon } from '../types/world';
import { renderers } from './assetRenderers/registry';

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

export default function AssetViewer({ beacon, onClose, reducedMotion }: AssetViewerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const Renderer = renderers[beacon.type];

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={`bg-neutral-900 border border-white/10 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col ${
          reducedMotion ? '' : 'transition-all duration-300 ease-out'
        }`}
        role={Renderer ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-label={beacon.label}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-semibold text-white">{beacon.label}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1"
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-auto min-h-0">
          {Renderer ? (
            <Renderer beacon={beacon} />
          ) : (
            <p className="text-white/80">
              No viewer available for asset type &ldquo;{beacon.type}&rdquo;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
