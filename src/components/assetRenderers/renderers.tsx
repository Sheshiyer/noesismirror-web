import type { FC, CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import type { BeaconRendererProps } from './types';
import { buildAssetUrl } from '../../config';
import { FieldSurface } from '../hud/FieldHudChrome';

const isMarkdownUrl = (url: string): boolean => /\.md(\?|$)/i.test(url);
const isJsonUrl = (url: string): boolean => /\.json(\?|$)/i.test(url);

function stripFrontmatter(text: string): string {
  const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  return match ? text.slice(match[0].length).trimStart() : text;
}

// TP4-009 — rough word count for read-time estimate.
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// TP4-018 — synchronous markdown parse using the `marked` library.
// We configure once at module load; gfm/breaks are sensible defaults.
marked.setOptions({ gfm: true, breaks: false });
function renderMarkdown(src: string): string {
  // marked.parse can theoretically return a Promise when async opts are set;
  // we keep it synchronous by leaving async off, but coerce here for safety.
  const out = marked.parse(src);
  return typeof out === 'string' ? out : '';
}

// TP4-019 — text-size cycle for reading viewers.
type TextSize = 'S' | 'M' | 'L';
const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  S: 'text-base',
  M: 'text-lg',
  L: 'text-xl',
};
function nextSize(s: TextSize, dir: 1 | -1): TextSize {
  const order: TextSize[] = ['S', 'M', 'L'];
  const i = Math.min(order.length - 1, Math.max(0, order.indexOf(s) + dir));
  return order[i];
}

// TP4-018 — shared Tailwind prose styling for marked-rendered HTML.
// Uses the brand palette via arbitrary-variant child selectors so we don't
// need the @tailwindcss/typography plugin.
const PROSE_CLASS =
  'max-w-[60ch] mx-auto font-sans text-noesis-parchment leading-relaxed ' +
  '[&_h1]:font-display [&_h1]:text-noesis-gold [&_h1]:text-3xl [&_h1]:mt-8 [&_h1]:mb-4 ' +
  '[&_h2]:font-display [&_h2]:text-noesis-gold [&_h2]:text-2xl [&_h2]:mt-6 [&_h2]:mb-3 ' +
  '[&_h3]:font-display [&_h3]:text-noesis-gold [&_h3]:text-xl [&_h3]:mt-5 [&_h3]:mb-2 ' +
  '[&_h4]:font-display [&_h4]:text-noesis-gold [&_h4]:text-lg [&_h4]:mt-4 [&_h4]:mb-2 ' +
  '[&_h5]:font-display [&_h5]:text-noesis-gold [&_h6]:font-display [&_h6]:text-noesis-gold ' +
  '[&_p]:my-4 [&_p]:text-noesis-parchment/80 ' +
  '[&_a]:text-noesis-emerald [&_a]:underline hover:[&_a]:text-noesis-gold ' +
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 ' +
  '[&_li]:my-1 [&_li]:text-noesis-parchment/80 ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-noesis-gold/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-noesis-parchment/70 ' +
  '[&_code]:font-mono [&_code]:text-noesis-emerald [&_code]:text-sm ' +
  '[&_pre]:bg-noesis-void [&_pre]:border [&_pre]:border-noesis-gold/20 [&_pre]:p-4 [&_pre]:overflow-auto ' +
  '[&_pre_code]:text-noesis-parchment/90 ' +
  '[&_hr]:border-noesis-gold/20 [&_hr]:my-8 ' +
  '[&_strong]:text-noesis-parchment [&_em]:text-noesis-parchment/90 ' +
  '[&_table]:w-full [&_table]:my-4 [&_th]:font-display [&_th]:text-noesis-gold [&_th]:text-left [&_th]:py-2 [&_th]:border-b [&_th]:border-noesis-gold/30 ' +
  '[&_td]:py-2 [&_td]:border-b [&_td]:border-noesis-gold/10 [&_td]:text-noesis-parchment/80';

// ---------------------------------------------------------------------------
// TP4-033 — Shared loading sigil (inline, no new file).
// Sacred-Gold pulsing brand glyph at Panchang 2xl, motion-safe animation.
// ---------------------------------------------------------------------------
const LoadingSigil: FC = () => (
  <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
    <div
      className="w-8 h-8 flex items-center justify-center font-display text-2xl text-noesis-gold motion-safe:animate-pulse"
      aria-label="Loading"
    >
      {'◆'}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// TP4-034 — Shared error block (inline, no new file).
// Brand-aligned: emerald uppercase mono text, [ RETRY ] + [ DOWNLOAD ] buttons
// styled to match the existing brand button look (no rounding, no shadow).
// ---------------------------------------------------------------------------
interface ErrorBlockProps {
  url: string; // already-resolved buildAssetUrl(...) string for DOWNLOAD link
  onRetry: () => void;
}
const ErrorBlock: FC<ErrorBlockProps> = ({ url, onRetry }) => (
  <FieldSurface className="mx-auto max-w-[60ch] p-6">
    <p className="font-mono text-sm uppercase tracking-[0.24em] text-noesis-emerald">
      Failed to load asset
    </p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onRetry}
        className="border border-noesis-gold/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
      >
        Retry
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="border border-noesis-gold/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
      >
        Download
      </a>
    </div>
  </FieldSurface>
);

type FetchStatus = 'loading' | 'ready' | 'error';

// ---------------------------------------------------------------------------
// TP4-019 — text-size +/- shortcut hook for reading-style viewers.
// Listens at the document level so it works regardless of focus.
// ---------------------------------------------------------------------------
function useTextSizeShortcut(): [TextSize, (s: TextSize) => void] {
  const [size, setSize] = useState<TextSize>('M');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Avoid stealing typing in form fields.
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
        e.preventDefault();
        setSize((s) => nextSize(s, 1));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setSize((s) => nextSize(s, -1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return [size, setSize];
}

// ---------------------------------------------------------------------------
// TP4-010 — scroll-position save/restore for reading-style viewers.
// Debounces writes; restores once `ready` flips true and the container exists.
// ---------------------------------------------------------------------------
function useScrollPersistence(
  ref: React.RefObject<HTMLElement | null>,
  storageKey: string,
  ready: boolean,
) {
  const [scrollPct, setScrollPct] = useState(0);
  // Restore on ready.
  useEffect(() => {
    if (!ready) return;
    const node = ref.current;
    if (!node) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const top = Number(raw);
        if (isFinite(top) && top > 0) {
          node.scrollTop = top;
        }
      }
    } catch {
      // ignore storage failures
    }
  }, [ready, storageKey, ref]);

  // Save on scroll, debounced 300ms; also track a percentage for display.
  useEffect(() => {
    if (!ready) return;
    const node = ref.current;
    if (!node) return;
    let t: number | null = null;
    const onScroll = () => {
      const max = node.scrollHeight - node.clientHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, node.scrollTop / max)) : 0;
      setScrollPct(pct);
      if (t != null) window.clearTimeout(t);
      t = window.setTimeout(() => {
        try {
          localStorage.setItem(storageKey, String(node.scrollTop));
        } catch {
          // ignore
        }
      }, 300);
    };
    node.addEventListener('scroll', onScroll);
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (t != null) window.clearTimeout(t);
    };
  }, [ready, storageKey, ref]);

  return scrollPct;
}

// ---------------------------------------------------------------------------
// ReadingViewer — markdown reports (.md)
// TP4-009 read-time, TP4-010 scroll-save, TP4-018 marked, TP4-019 text-size,
// TP4-024 metadata (word count via data-noesis-words on the scroll container).
// ---------------------------------------------------------------------------
export const ReadingViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [text, setText] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [size] = useTextSizeShortcut();

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setText('');
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        if (cancelled) return;
        setText(stripFrontmatter(raw));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const words = useMemo(() => (text ? countWords(text) : 0), [text]);
  const readMin = words > 0 ? Math.ceil(words / 220) : 0;
  const html = useMemo(() => (text ? renderMarkdown(text) : ''), [text]);

  const storageKey = `noesis_read_${beacon.id}`;
  const scrollPct = useScrollPersistence(scrollRef, storageKey, status === 'ready');

  if (status === 'loading') return <LoadingSigil />;
  if (status === 'error') return <ErrorBlock url={url} onRetry={retry} />;

  return (
    <div
      ref={scrollRef}
      data-noesis-words={words}
      className="h-full overflow-auto"
    >
      <FieldSurface className="mx-auto mb-4 max-w-[60ch] px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/50">
            {readMin} min read
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/40">
            {Math.round(scrollPct * 100)}% read
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/40">
            size {size} · [ + / - ]
          </span>
        </div>
      </FieldSurface>
      <article
        className={`${PROSE_CLASS} ${TEXT_SIZE_CLASS[size]}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// AudioViewer
// TP4-034 — onError surfaces brand error block with retry/download.
// ---------------------------------------------------------------------------
export const AudioViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const heading = beacon.summary || beacon.label;
  const url = buildAssetUrl(beacon.assetUrl);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => {
    setErrored(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <FieldSurface className="p-6 [&_audio]:accent-noesis-emerald">
      <h3 className="mb-4 font-display text-xl tracking-[0.08em] text-noesis-gold">
        {heading}
      </h3>
      {errored ? (
        <ErrorBlock url={url} onRetry={retry} />
      ) : (
        <audio
          key={reloadKey}
          controls
          src={url}
          className="w-full"
          preload="metadata"
          onError={() => setErrored(true)}
          aria-label={`Audio: ${beacon.label}`}
        />
      )}
    </FieldSurface>
  );
};

// ---------------------------------------------------------------------------
// TP4-004 — Custom video controls (Sacred-Gold).
// Builds a minimal control bar: play/pause toggle, scrubber, time, volume.
// Keyboard shortcuts (Space, arrows) are handled by AssetViewer's onKeyDown.
// ---------------------------------------------------------------------------
function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface CustomVideoControlsProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}
const CustomVideoControls: FC<CustomVideoControlsProps> = ({ videoRef }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(isFinite(v.duration) ? v.duration : 0);
    const onVol = () => setVolume(v.volume);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onDur);
    v.addEventListener('durationchange', onDur);
    v.addEventListener('volumechange', onVol);
    // initial sync
    setVolume(v.volume);
    setDuration(isFinite(v.duration) ? v.duration : 0);
    setCurrentTime(v.currentTime);
    setPlaying(!v.paused);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onDur);
      v.removeEventListener('durationchange', onDur);
      v.removeEventListener('volumechange', onVol);
    };
  }, [videoRef]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [videoRef]);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const pct = Number(e.target.value) / 1000;
    if (isFinite(v.duration) && v.duration > 0) {
      v.currentTime = pct * v.duration;
    }
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Number(e.target.value) / 100;
  };

  const seekValue = duration > 0 ? Math.round((currentTime / duration) * 1000) : 0;

  // Sacred-Gold + Coherence-Emerald range styling via accent-color and
  // a tiny inline style for the gradient track.
  const seekStyle: CSSProperties = {
    accentColor: '#10B5A7',
    background: `linear-gradient(to right, #10B5A7 0%, #10B5A7 ${
      duration > 0 ? (currentTime / duration) * 100 : 0
    }%, rgba(212,175,55,0.2) ${
      duration > 0 ? (currentTime / duration) * 100 : 0
    }%, rgba(212,175,55,0.2) 100%)`,
  };
  const volStyle: CSSProperties = {
    accentColor: '#C5A017',
    background: `linear-gradient(to right, #C5A017 0%, #C5A017 ${
      volume * 100
    }%, rgba(212,175,55,0.2) ${volume * 100}%, rgba(212,175,55,0.2) 100%)`,
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-noesis-void/80 border-t border-noesis-gold/20">
      <button
        type="button"
        onClick={togglePlay}
        className="font-display text-noesis-gold text-2xl leading-none hover:text-noesis-emerald focus:outline-none focus:ring-1 focus:ring-noesis-gold/60 w-8 text-center"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '◑' : '◐'}
      </button>
      <input
        type="range"
        min={0}
        max={1000}
        value={seekValue}
        onChange={onSeek}
        aria-label="Seek"
        className="flex-1 h-1 appearance-none cursor-pointer"
        style={seekStyle}
      />
      <span className="font-mono text-xs text-noesis-parchment/70 tabular-nums shrink-0">
        {fmtTime(currentTime)} / {fmtTime(duration)}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(volume * 100)}
        onChange={onVolume}
        aria-label="Volume"
        className="w-20 h-1 appearance-none cursor-pointer"
        style={volStyle}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// VideoViewer
// TP4-004 — custom controls in Sacred-Gold (native controls removed).
// TP4-034 — onError surfaces brand error block with retry/download.
// ---------------------------------------------------------------------------
export const VideoViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retry = useCallback(() => {
    setErrored(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <FieldSurface className="p-6">
      {errored ? (
        <ErrorBlock url={url} onRetry={retry} />
      ) : (
        <div className="overflow-hidden border border-noesis-gold/20 bg-black">
          <video
            key={reloadKey}
            ref={videoRef}
            src={url}
            className="w-full max-h-[70vh] bg-black"
            preload="metadata"
            onError={() => setErrored(true)}
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) void v.play().catch(() => {});
              else v.pause();
            }}
            aria-label={`Video: ${beacon.label}`}
          />
          <CustomVideoControls videoRef={videoRef} />
        </div>
      )}
      {beacon.summary && !errored && (
        <p className="font-mono text-xs text-noesis-parchment/50 mt-3 text-center">
          {beacon.summary}
        </p>
      )}
    </FieldSurface>
  );
};

// ---------------------------------------------------------------------------
// SlidesViewer — PDF via <object>
// TP4-015 — page-count chip + prev/next placeholders (PDF page count is not
//   reliably available via <object> postMessage; we show a static chip and
//   surface the navigation hint to satisfy the spec's v1 fallback).
// TP4-016 — PageUp/PageDown propagate to the embed naturally; we install a
//   document-level listener inside the viewer that only no-ops when the
//   embed is focused so it never blocks the native viewer.
// ---------------------------------------------------------------------------
export const SlidesViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const objRef = useRef<HTMLObjectElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(url, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setStatus('error');
        } else {
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  // TP4-016 — slide nav keys. Native PDF viewers handle PageUp/PageDown when
  // focused; this listener exists so we can call focus() on the embed before
  // routing the key, ensuring the keystroke reaches the viewer process.
  useEffect(() => {
    if (status !== 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
      const obj = objRef.current;
      if (!obj) return;
      try {
        obj.focus();
      } catch {
        // ignore
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [status]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  if (status === 'loading') return <LoadingSigil />;
  if (status === 'error') return <ErrorBlock url={url} onRetry={retry} />;

  return (
    <FieldSurface className="p-6">
      <h3 className="mb-3 font-display text-xl tracking-[0.08em] text-noesis-gold">
        {beacon.label}
      </h3>
      <object
        ref={objRef}
        data={url}
        type="application/pdf"
        className="h-[75vh] w-full bg-black"
        tabIndex={0}
      >
        <FieldSurface className="p-6">
          <p className="mb-3 font-mono text-sm text-noesis-parchment/80">
            Your browser cannot display this PDF inline.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-noesis-gold underline transition-colors hover:text-noesis-emerald"
          >
            Open slides in new tab
          </a>
        </FieldSurface>
      </object>
      {/* TP4-015 — page-count chip + nav hints */}
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/50">
          PDF Viewer
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => objRef.current?.focus()}
            className="border border-noesis-gold/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
            aria-label="Previous page"
            title="PageUp"
          >
            {'‹ prev'}
          </button>
          <button
            type="button"
            onClick={() => objRef.current?.focus()}
            className="border border-noesis-gold/40 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-noesis-gold transition-colors hover:border-noesis-emerald hover:text-noesis-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-noesis-gold/60"
            aria-label="Next page"
            title="PageDown"
          >
            {'next ›'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-noesis-parchment/30">
        [ PageUp / PageDown ]
      </p>
    </FieldSurface>
  );
};

// ---------------------------------------------------------------------------
// StudyViewer — markdown for quiz/flashcards, JSON for mind-map
// TP4-009/018/019 — read-time, marked, text-size cycling on the .md branch.
// ---------------------------------------------------------------------------
export const StudyViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const json = isJsonUrl(beacon.assetUrl);
  const markdown = isMarkdownUrl(beacon.assetUrl);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [content, setContent] = useState<string>('');
  const [data, setData] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [size] = useTextSizeShortcut();

  useEffect(() => {
    if (!json && !markdown) {
      // Nothing to fetch for unknown extension — show a passive notice (handled below).
      setStatus('ready');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setContent('');
    setData(null);

    if (json) {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((parsed) => {
          if (cancelled) return;
          setData(parsed);
          setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    } else {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((raw) => {
          if (cancelled) return;
          setContent(stripFrontmatter(raw));
          setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    }

    return () => {
      cancelled = true;
    };
  }, [url, json, markdown, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const words = useMemo(() => (content ? countWords(content) : 0), [content]);
  const readMin = words > 0 ? Math.ceil(words / 220) : 0;
  const html = useMemo(() => (content ? renderMarkdown(content) : ''), [content]);

  const storageKey = `noesis_read_${beacon.id}`;
  const scrollPct = useScrollPersistence(
    scrollRef,
    storageKey,
    markdown && status === 'ready',
  );

  if ((json || markdown) && status === 'loading') return <LoadingSigil />;
  if (status === 'error') return <ErrorBlock url={url} onRetry={retry} />;

  if (json) {
    return (
      <FieldSurface className="p-6">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/60">
          Interactive view coming soon &mdash; raw data shown below
        </p>
        <pre className="overflow-auto border border-noesis-gold/20 bg-noesis-void p-4 font-mono text-xs text-noesis-parchment/80">
          {JSON.stringify(data, null, 2)}
        </pre>
      </FieldSurface>
    );
  }

  if (!markdown) {
    return (
      <FieldSurface className="p-6">
        <p className="font-mono text-sm text-noesis-parchment/80">
          Study content will load from: {beacon.assetUrl}
        </p>
      </FieldSurface>
    );
  }

  return (
    <div
      ref={scrollRef}
      data-noesis-words={words}
      className="h-full overflow-auto"
    >
      <FieldSurface className="mx-auto mb-4 max-w-[60ch] px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/50">
            {readMin} min read
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/40">
            {Math.round(scrollPct * 100)}% read
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.24em] text-noesis-parchment/40">
            size {size} · [ + / - ]
          </span>
        </div>
      </FieldSurface>
      <article
        className={`${PROSE_CLASS} ${TEXT_SIZE_CLASS[size]}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
