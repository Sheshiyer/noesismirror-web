import { describe, expect, it } from 'vitest';
import { sniffMediaMimeType } from './assets';

const ftypDash = new Uint8Array([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x64, 0x61, 0x73, 0x68,
  0x00, 0x00, 0x00, 0x00,
]);

describe('sniffMediaMimeType', () => {
  it('serves an audio-path ftyp asset as audio/mp4 even when named .mp3', () => {
    expect(sniffMediaMimeType('audio/deep-dive-long.mp3', ftypDash, 'audio/mpeg')).toBe('audio/mp4');
  });

  it('serves a video-path ftyp asset as video/mp4', () => {
    expect(sniffMediaMimeType('video/video-brief.mp4', ftypDash, 'video/mp4')).toBe('video/mp4');
  });

  it('keeps true MP3 signatures as audio/mpeg', () => {
    expect(sniffMediaMimeType('audio/file.mp3', new Uint8Array([0x49, 0x44, 0x33]), 'audio/mpeg')).toBe('audio/mpeg');
    expect(sniffMediaMimeType('audio/file.mp3', new Uint8Array([0xff, 0xfb]), 'audio/mpeg')).toBe('audio/mpeg');
  });
});
