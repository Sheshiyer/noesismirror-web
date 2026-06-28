import type { FC } from 'react';
import type { BeaconRendererProps } from './types';

const isHtmlUrl = (url: string): boolean => /\.html?$/i.test(url);

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
  return (
    <article className="prose prose-invert max-w-none overflow-auto rounded border border-white/10 bg-black/40 p-4 text-sm">
      <pre className="whitespace-pre-wrap break-all">
        <code>{beacon.assetUrl}</code>
      </pre>
      <p>Study guide content will load from: {beacon.assetUrl}</p>
    </article>
  );
};
