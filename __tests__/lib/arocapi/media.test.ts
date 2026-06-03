import { describe, expect, it } from 'vitest';
import { isMediaFile } from '@/lib/arocapi/media';

describe('isMediaFile', () => {
  it('keeps audio files', () => {
    expect(isMediaFile({ mediaType: 'audio/wav' })).toBe(true);
    expect(isMediaFile({ mediaType: 'audio/x-wav' })).toBe(true);
    expect(isMediaFile({ mediaType: 'audio/mpeg' })).toBe(true);
  });

  it('keeps video files', () => {
    expect(isMediaFile({ mediaType: 'video/mp4' })).toBe(true);
  });

  it('rejects non-media files', () => {
    expect(isMediaFile({ mediaType: 'application/pdf' })).toBe(false);
    expect(isMediaFile({ mediaType: 'image/jpeg' })).toBe(false);
    expect(isMediaFile({ mediaType: 'text/x-eaf+xml' })).toBe(false);
  });

  it('matches case-insensitively', () => {
    expect(isMediaFile({ mediaType: 'Audio/WAV' })).toBe(true);
  });

  it('rejects a missing or empty mediaType', () => {
    expect(isMediaFile({ mediaType: '' })).toBe(false);
    expect(isMediaFile({ mediaType: undefined as unknown as string })).toBe(false);
  });
});
