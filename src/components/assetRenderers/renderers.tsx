import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { BeaconRendererProps } from './types';
import { buildAssetUrl } from '../../config';

const isMarkdownUrl = (url: string): boolean => /\.md(\?|$)/i.test(url);
const isJsonUrl = (url: string): boolean => /\.json(\?|$)/i.test(url);

function stripFrontmatter(text: string): string {
  const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  return match ? text.slice(match[0].length).trimStart() : text;
}

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
  <div className="border border-noesis-emerald/40 bg-noesis-void/60 p-6 max-w-[60ch] mx-auto">
    <p className="font-mono text-noesis-emerald uppercase text-sm tracking-widest">
      Failed to load asset
    </p>
    <div className="flex items-center gap-4 mt-4">
      <button
        type="button"
        onClick={onRetry}
        className="font-mono text-xs text-noesis-gold uppercase tracking-widest border border-noesis-gold/40 px-3 py-1 hover:text-noesis-emerald hover:border-noesis-emerald/60 focus:outline-none focus:ring-1 focus:ring-noesis-gold/60"
      >
        [ RETRY ]
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="font-mono text-xs text-noesis-gold uppercase tracking-widest border border-noesis-gold/40 px-3 py-1 hover:text-noesis-emerald hover:border-noesis-emerald/60 focus:outline-none focus:ring-1 focus:ring-noesis-gold/60"
      >
        [ DOWNLOAD ]
      </a>
    </div>
  </div>
);

type FetchStatus = 'loading' | 'ready' | 'error';

// ---------------------------------------------------------------------------
// ReadingViewer — markdown reports (.md)
// ---------------------------------------------------------------------------
export const ReadingViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [text, setText] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);

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

  if (status === 'loading') return <LoadingSigil />;
  if (status === 'error') return <ErrorBlock url={url} onRetry={retry} />;

  // No markdown library available in deps — render raw text preserving whitespace.
  // Headings inside the article still inherit `font-display` via the prose container.
  return (
    <article className="prose prose-invert max-w-[60ch] mx-auto text-noesis-parchment font-sans [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h4]:font-display [&_h5]:font-display [&_h6]:font-display">
      <pre className="whitespace-pre-wrap font-sans text-noesis-parchment leading-relaxed bg-transparent border-0 p-0 m-0">
        {text}
      </pre>
    </article>
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
    <div className="bg-noesis-void p-6 [&_audio]:accent-noesis-emerald">
      <h3 className="font-display text-noesis-gold text-xl mb-4">{heading}</h3>
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
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// VideoViewer
// TP4-034 — onError surfaces brand error block with retry/download.
// ---------------------------------------------------------------------------
export const VideoViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const [errored, setErrored] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => {
    setErrored(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <div>
      {errored ? (
        <ErrorBlock url={url} onRetry={retry} />
      ) : (
        <video
          key={reloadKey}
          controls
          src={url}
          className="w-full max-h-[70vh] bg-black"
          preload="metadata"
          onError={() => setErrored(true)}
        />
      )}
      {beacon.summary && !errored && (
        <p className="font-mono text-xs text-noesis-parchment/50 mt-3 text-center">
          {beacon.summary}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SlidesViewer — PDF via <object>
// TP4-033 / TP4-034 — HEAD-probe gives us loading + error states.
// ---------------------------------------------------------------------------
export const SlidesViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);

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

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  if (status === 'loading') return <LoadingSigil />;
  if (status === 'error') return <ErrorBlock url={url} onRetry={retry} />;

  return (
    <div>
      <h3 className="font-display text-noesis-gold text-xl mb-3">{beacon.label}</h3>
      <object data={url} type="application/pdf" className="w-full h-[75vh] bg-black">
        <div className="p-6 bg-noesis-void">
          <p className="font-mono text-sm text-noesis-parchment/70 mb-3">
            Your browser cannot display this PDF inline.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-noesis-gold underline hover:text-noesis-emerald"
          >
            Open slides in new tab
          </a>
        </div>
      </object>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StudyViewer — markdown for quiz/flashcards, JSON for mind-map
// TP4-033 / TP4-034 — unified status state-machine across .md and .json branches.
// ---------------------------------------------------------------------------
export const StudyViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
  const json = isJsonUrl(beacon.assetUrl);
  const markdown = isMarkdownUrl(beacon.assetUrl);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [content, setContent] = useState<string>('');
  const [data, setData] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  if ((json || markdown) && status === 'loading') return <LoadingSigil />;
  if (status === 'error') return <ErrorBlock url={url} onRetry={retry} />;

  if (json) {
    return (
      <div>
        <p className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-widest mb-3">
          Interactive view coming soon &mdash; raw data shown below
        </p>
        <pre className="font-mono text-xs text-noesis-parchment/80 overflow-auto bg-noesis-void p-4 border border-noesis-gold/20">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  if (!markdown) {
    return (
      <p className="font-mono text-sm text-noesis-parchment/70">
        Study content will load from: {beacon.assetUrl}
      </p>
    );
  }

  return (
    <article className="prose prose-invert max-w-[60ch] mx-auto text-noesis-parchment font-sans [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h4]:font-display [&_h5]:font-display [&_h6]:font-display">
      <pre className="whitespace-pre-wrap font-sans text-noesis-parchment leading-relaxed bg-transparent border-0 p-0 m-0">
        {content}
      </pre>
    </article>
  );
};
