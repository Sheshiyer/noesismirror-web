import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { BeaconRendererProps } from './types';

const isHtmlUrl = (url: string): boolean => /\.html?$/i.test(url);
const isMarkdownUrl = (url: string): boolean => /\.md$/i.test(url);

interface MindMapNode {
  name: string;
  children?: MindMapNode[];
}

function renderTree(nodes: MindMapNode[], depth: number): React.ReactNode {
  return (
    <ul className="list-none space-y-0.5" style={{ paddingLeft: depth > 0 ? `${depth * 16}px` : '0' }}>
      {nodes.map((node, i) => (
        <li key={i}>
          <span
            className={depth === 0 ? 'font-semibold' : ''}
            style={{
              color: depth === 0 ? 'var(--noesis-gold)' : 'var(--noesis-parchment)',
              fontSize: depth === 0 ? '0.875rem' : '0.8rem',
              fontFamily: depth === 0 ? 'var(--noesis-font-display)' : 'var(--noesis-font-body)',
            }}
          >
            {node.name}
          </span>
          {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
        </li>
      ))}
    </ul>
  );
}

const MindMapJsonView: FC<{ assetUrl: string }> = ({ assetUrl }) => {
  const [jsonData, setJsonData] = useState<MindMapNode[] | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(assetUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          const nodes = data.children ? [data as MindMapNode] : (data.root ? [data.root] : []);
          setJsonData(nodes);
        }
      })
      .catch((err) => {
        if (!cancelled) setJsonError(err instanceof Error ? err.message : 'Failed to load mind map');
      });
    return () => { cancelled = true; };
  }, [assetUrl]);

  if (jsonError) {
    return (
      <article className="prose prose-invert max-w-none overflow-auto rounded border border-white/10 bg-black/40 p-4 text-sm">
        <p className="text-red-400">Could not load mind map: {jsonError}</p>
      </article>
    );
  }

  return (
    <article className="prose prose-invert max-w-none overflow-auto rounded border border-white/10 bg-black/40 p-4 text-sm">
      {jsonData === null ? (
        <p style={{ color: 'var(--noesis-silver)' }}>Loading mind map…</p>
      ) : (
        renderTree(jsonData, 0)
      )}
    </article>
  );
};

function stripFrontmatter(text: string): string {
  const match = text.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  return match ? text.slice(match[0].length).trimStart() : text;
}

export const ReadingViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="space-y-2">
      <iframe
        className="w-full h-96 rounded border border-white/10 bg-white"
        src={beacon.assetUrl}
        title={beacon.label}
        sandbox="allow-same-origin"
      />
      {!isHtmlUrl(beacon.assetUrl) && (
        <p className="text-sm text-white/80">{beacon.assetUrl}</p>
      )}
    </div>
  );
};

export const AudioViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="rounded border border-white/10 bg-black/40 p-4">
      <p className="text-sm mb-2" style={{ color: 'var(--noesis-silver)' }}>Audio Companion</p>
      <audio controls src={beacon.assetUrl} className="w-full" />
    </div>
  );
};

export const VideoViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="rounded border border-white/10 bg-black/40 overflow-hidden">
      <video controls src={beacon.assetUrl} className="w-full max-h-[60vh]" />
    </div>
  );
};

export const SlidesViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="space-y-4">
      <iframe
        className="w-full h-96 rounded border border-white/10 bg-white"
        src={beacon.assetUrl}
        title={beacon.label}
      />
      <a
        href={beacon.assetUrl}
        download
        className="inline-block px-4 py-2 rounded text-sm transition-colors"
        style={{
          border: '1px solid var(--noesis-gold)',
          color: 'var(--noesis-gold)',
        }}
      >
        Download slides
      </a>
    </div>
  );
};

export const StudyViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(beacon.assetUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setContent(stripFrontmatter(text));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load study guide');
      });
    return () => {
      cancelled = true;
    };
  }, [beacon.assetUrl]);

  if (error) {
    return (
      <article className="prose prose-invert max-w-none overflow-auto rounded border border-white/10 bg-black/40 p-4 text-sm">
        <p className="text-red-400">Could not load study guide: {error}</p>
        <p className="text-white/60">{beacon.assetUrl}</p>
      </article>
    );
  }

  if (beacon.assetUrl.endsWith('.json')) {
    return <MindMapJsonView assetUrl={beacon.assetUrl} />;
  }

  if (!isMarkdownUrl(beacon.assetUrl)) {
    return (
      <article className="prose prose-invert max-w-none overflow-auto rounded border border-white/10 bg-black/40 p-4 text-sm">
        <p>Study guide content will load from: {beacon.assetUrl}</p>
      </article>
    );
  }

  return (
    <article className="prose prose-invert max-w-none overflow-auto rounded border border-white/10 bg-black/40 p-4 text-sm">
      {content === null ? (
        <p className="text-white/60">Loading study guide…</p>
      ) : (
        <div className="whitespace-pre-wrap leading-relaxed text-white/90">
          {content}
        </div>
      )}
    </article>
  );
};
