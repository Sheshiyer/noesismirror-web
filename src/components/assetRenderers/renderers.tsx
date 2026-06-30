import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { BeaconRendererProps } from './types';
import { buildAssetUrl } from '../../config';

const isMarkdownUrl = (url: string): boolean => /\.md(\?|$)/i.test(url);
const isJsonUrl = (url: string): boolean => /\.json(\?|$)/i.test(url);

function stripFrontmatter(text: string): string {
  const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  return match ? text.slice(match[0].length).trimStart() : text;
}

// ---------------------------------------------------------------------------
// ReadingViewer — markdown reports (.md)
// ---------------------------------------------------------------------------
export const ReadingViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(null);
    fetch(buildAssetUrl(beacon.assetUrl))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((raw) => {
        if (!cancelled) setText(stripFrontmatter(raw));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load reading');
      });
    return () => {
      cancelled = true;
    };
  }, [beacon.assetUrl]);

  if (error) {
    return (
      <article className="prose prose-invert max-w-[60ch] mx-auto text-noesis-parchment font-sans">
        <p className="text-red-400 font-mono text-sm">Could not load reading: {error}</p>
      </article>
    );
  }

  if (text === null) {
    return (
      <p className="font-mono text-xs text-noesis-parchment/60 text-center mt-12">
        Loading reading…
      </p>
    );
  }

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
// ---------------------------------------------------------------------------
export const AudioViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const heading = beacon.summary || beacon.label;
  return (
    <div className="bg-noesis-void p-6 [&_audio]:accent-noesis-emerald">
      <h3 className="font-display text-noesis-gold text-xl mb-4">{heading}</h3>
      <audio
        controls
        src={buildAssetUrl(beacon.assetUrl)}
        className="w-full"
        preload="metadata"
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// VideoViewer
// ---------------------------------------------------------------------------
export const VideoViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div>
      <video
        controls
        src={buildAssetUrl(beacon.assetUrl)}
        className="w-full max-h-[70vh] bg-black"
        preload="metadata"
      />
      {beacon.summary && (
        <p className="font-mono text-xs text-noesis-parchment/50 mt-3 text-center">
          {beacon.summary}
        </p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SlidesViewer — PDF via <object>
// ---------------------------------------------------------------------------
export const SlidesViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const url = buildAssetUrl(beacon.assetUrl);
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
// ---------------------------------------------------------------------------
export const StudyViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const json = isJsonUrl(beacon.assetUrl);
  const [content, setContent] = useState<string | null>(null);
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setData(null);
    setError(null);

    const url = buildAssetUrl(beacon.assetUrl);

    if (json) {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((parsed) => {
          if (!cancelled) setData(parsed);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load study data');
        });
    } else if (isMarkdownUrl(beacon.assetUrl)) {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((raw) => {
          if (!cancelled) setContent(stripFrontmatter(raw));
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load study guide');
        });
    }

    return () => {
      cancelled = true;
    };
  }, [beacon.assetUrl, json]);

  if (error) {
    return (
      <p className="font-mono text-sm text-red-400">Could not load study material: {error}</p>
    );
  }

  if (json) {
    return (
      <div>
        <p className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-widest mb-3">
          Interactive view coming soon &mdash; raw data shown below
        </p>
        {data === null ? (
          <p className="font-mono text-xs text-noesis-parchment/60">Loading study data…</p>
        ) : (
          <pre className="font-mono text-xs text-noesis-parchment/80 overflow-auto bg-noesis-void p-4 border border-noesis-gold/20">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  if (!isMarkdownUrl(beacon.assetUrl)) {
    return (
      <p className="font-mono text-sm text-noesis-parchment/70">
        Study content will load from: {beacon.assetUrl}
      </p>
    );
  }

  return (
    <article className="prose prose-invert max-w-[60ch] mx-auto text-noesis-parchment font-sans [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h4]:font-display [&_h5]:font-display [&_h6]:font-display">
      {content === null ? (
        <p className="font-mono text-xs text-noesis-parchment/60">Loading study guide…</p>
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-noesis-parchment leading-relaxed bg-transparent border-0 p-0 m-0">
          {content}
        </pre>
      )}
    </article>
  );
};
