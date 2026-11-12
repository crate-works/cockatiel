import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Waveform } from '@/components/Waveform';
import { useAppStore } from '@/lib/store';
import { createFakeMediaPlayer, type FakeMediaPlayer } from '../lib/media-player/fake';

const players = vi.hoisted(() => ({ current: null as FakeMediaPlayer | null }));

vi.mock('@/lib/media-player/wavesurfer', () => ({
  createWavesurferMediaPlayer: () => players.current,
}));

const audio = () => new File(['x'], 'session.wav', { type: 'audio/wav' });

const renderWaveform = (audioFile: File | null) => render(<Waveform audioFile={audioFile} />);

describe('Waveform overlay', () => {
  let player: FakeMediaPlayer;

  beforeEach(() => {
    useAppStore.getState().reset();
    player = createFakeMediaPlayer();
    players.current = player;
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  it('says the audio is decoding once the player starts decoding', () => {
    renderWaveform(audio());

    act(() => player.simulateLoadPhase('decoding'));

    expect(screen.getByText('Decoding audio…')).toBeInTheDocument();
  });

  it('says the media is loading as soon as a file is handed to the player', () => {
    renderWaveform(audio());

    expect(screen.getByText('Loading media…')).toBeInTheDocument();
    expect(player.getState().loadPhase).toBe('loading');
  });

  it('hides the overlay once the waveform is ready', () => {
    renderWaveform(audio());

    act(() => player.simulateReady(60));

    expect(screen.queryByText(/media|audio/i)).not.toBeInTheDocument();
  });

  it('stops the spinner and says the load failed when decoding fails', () => {
    const { container } = renderWaveform(audio());

    act(() => player.simulateLoadPhase('error'));

    expect(screen.getByText("Couldn't load media")).toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('starts again at loading when a different file replaces a ready one', () => {
    const { rerender } = renderWaveform(audio());
    act(() => player.simulateReady(60));

    rerender(<Waveform audioFile={audio()} />);

    expect(screen.getByText('Loading media…')).toBeInTheDocument();
  });

  describe('before the player has a file', () => {
    beforeEach(() => {
      useAppStore.setState({ sourceUrl: 'https://example.org/session.wav' });
    });

    it('shows download progress while the media downloads', () => {
      useAppStore.setState({ mediaDownload: { fraction: 0.42, kind: 'downloading' } });

      renderWaveform(null);

      expect(screen.getByText('Downloading media… 42%')).toBeInTheDocument();
    });

    it('omits the percentage when the download size is unknown', () => {
      useAppStore.setState({ mediaDownload: { kind: 'downloading' } });

      renderWaveform(null);

      expect(screen.getByText('Downloading media…')).toBeInTheDocument();
    });

    it('stops the spinner and says the download failed', () => {
      useAppStore.setState({ mediaDownload: { kind: 'failed' } });

      const { container } = renderWaveform(null);

      expect(screen.getByText("Couldn't download media")).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeNull();
    });

    it('says the media is loading while a remote source is being re-acquired', () => {
      renderWaveform(null);

      expect(screen.getByText('Loading media…')).toBeInTheDocument();
    });

    it('says no media is loaded, without a spinner, when a local-file session awaits its file', () => {
      useAppStore.setState({ catalogSource: null, sourceUrl: null });

      const { container } = renderWaveform(null);

      expect(screen.getByText('No media loaded')).toBeInTheDocument();
      expect(container.querySelector('.animate-spin')).toBeNull();
    });
  });
});
