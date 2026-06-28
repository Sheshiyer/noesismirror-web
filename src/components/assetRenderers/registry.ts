import type { FC } from 'react';
import type { BeaconType } from '../../types/world';
import type { BeaconRendererProps } from './types';
import {
  ReadingViewer,
  AudioViewer,
  VideoViewer,
  SlidesViewer,
  StudyViewer,
} from './renderers';

export const renderers: Partial<Record<BeaconType, FC<BeaconRendererProps>>> = {
  reading: ReadingViewer,
  audio: AudioViewer,
  video: VideoViewer,
  slides: SlidesViewer,
  study: StudyViewer,
};
