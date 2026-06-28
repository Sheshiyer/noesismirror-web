import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { BeaconRendererProps } from './types';

const isHtmlUrl = (url: string): boolean => /\.html?$/i.test(url);
const isMarkdownUrl = (url: string): boolean => /\.md$/i.test(url);

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
        sandbox=""
      />
      {!isHtmlUrl(beacon.assetUrl) && (
        <p className="text-sm text-white/80">{beacon.assetUrl}</p>
      )}
    </div>
  );
};

export const AudioViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <div className="space-y-2">
      <audio controls src={beacon.assetUrl} className="w-full" />
      <a
        href={beacon.assetUrl}
        className="text-sm text-white/80 underline"
        target="_blank"
        rel="noreferrer"
      >
        {beacon.assetUrl}
      </a>
    </div>
  );
};

export const VideoViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <video
      controls
      src={beacon.assetUrl}
      className="w-full max-h-[60vh]"
    />
  );
};

export const SlidesViewer: FC<BeaconRendererProps> = ({ beacon }) => {
  return (
    <iframe
      className="w-full h-96 rounded border border-white/10 bg-white"
      src={beacon.assetUrl}
      title={beacon.label}
      sandbox=""
    />
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
