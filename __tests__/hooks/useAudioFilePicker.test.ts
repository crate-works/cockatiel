import { describe, expect, it } from 'vitest';
import { isVideoFile } from '@/hooks/useAudioFilePicker';

describe('isVideoFile', () => {
  it('trusts a video MIME type', () => {
    expect(isVideoFile(new File([], 'clip.bin', { type: 'video/mp4' }))).toBe(true);
  });

  it('trusts an audio MIME type over a video extension', () => {
    expect(isVideoFile(new File([], 'voice.webm', { type: 'audio/webm' }))).toBe(false);
  });

  it('falls back to the extension when the type is empty', () => {
    expect(isVideoFile(new File([], 'Interview.MKV'))).toBe(true);
    expect(isVideoFile(new File([], 'interview.mov'))).toBe(true);
  });

  it('treats an untyped audio file as audio', () => {
    expect(isVideoFile(new File([], 'song.flac'))).toBe(false);
  });
});
