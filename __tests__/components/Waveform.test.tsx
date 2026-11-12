import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Controls } from '@/components/Controls';
import { Waveform } from '@/components/Waveform';
import { ZoomControl } from '@/components/ZoomControl';
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

const withControls = (audioFile: File | null) => (
  <Waveform audioFile={audioFile}>
    <Controls />
    <ZoomControl />
  </Waveform>
);

describe('player controls follow the load phase', () => {
  let player: FakeMediaPlayer;

  beforeEach(() => {
    useAppStore.getState().reset();
    player = createFakeMediaPlayer({ containerWidth: 600 });
    players.current = player;
  });

  afterEach(() => {
    useAppStore.getState().reset();
  });

  describe('play button', () => {
    it.each(['decoding', 'error'] as const)('stays disabled while the load phase is %s', (phase) => {
      render(withControls(audio()));

      act(() => player.simulateLoadPhase(phase));

      expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    });

    it('is disabled until the media is ready', () => {
      render(withControls(audio()));
      expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();

      act(() => player.simulateReady(60));

      expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
    });

    it('is disabled again while a replacement file loads', () => {
      const { rerender } = render(withControls(audio()));
      act(() => player.simulateReady(60));

      rerender(withControls(audio()));

      expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled();
    });
  });

  describe('zoom', () => {
    // Base UI hides the thumb until it measures layout, which jsdom never provides.
    const zoomSlider = () => screen.getByRole('slider', { hidden: true });

    it('is disabled until the waveform is ready, then starts fully zoomed out', () => {
      render(withControls(audio()));
      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();

      act(() => player.simulateReady(60));

      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
      expect(zoomSlider()).toHaveAttribute('aria-valuenow', '0');
    });

    it('follows zoom changes made outside the slider', () => {
      render(withControls(audio()));
      act(() => player.simulateReady(60));

      act(() => player.setZoom(1000));

      expect(Number(zoomSlider().getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    });

    it('zooms the player when the zoom-in button is pressed', () => {
      render(withControls(audio()));
      act(() => player.simulateReady(60));

      act(() => screen.getByRole('button', { name: 'Zoom in' }).click());

      expect(player.getState().pxPerSec).toBeGreaterThan(10);
      expect(Number(zoomSlider().getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    });

    it('is disabled again while a replacement file loads', () => {
      const { rerender } = render(withControls(audio()));
      act(() => player.simulateReady(60));

      rerender(withControls(audio()));

      expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    });
  });

  describe('time display', () => {
    it('shows the recording length once ready', () => {
      render(withControls(audio()));
      expect(screen.getByText('0:00.0 / 0:00.0')).toBeInTheDocument();

      act(() => player.simulateReady(75.5));

      expect(screen.getByText('0:00.0 / 1:15.5')).toBeInTheDocument();
    });

    it('follows the current time during playback', () => {
      render(withControls(audio()));
      act(() => player.simulateReady(75.5));

      act(() => player.simulateTimeUpdate(12.3));

      expect(screen.getByText('0:12.3 / 1:15.5')).toBeInTheDocument();
    });

    it('goes back to zero while a replacement file loads', () => {
      const { rerender } = render(withControls(audio()));
      act(() => player.simulateReady(75.5));
      act(() => player.simulateTimeUpdate(12.3));

      rerender(withControls(audio()));

      expect(screen.getByText('0:00.0 / 0:00.0')).toBeInTheDocument();
    });

    it('starts the replacement file at zero once it is ready', () => {
      const { rerender } = render(withControls(audio()));
      act(() => player.simulateReady(75.5));
      act(() => player.simulateTimeUpdate(12.3));

      rerender(withControls(audio()));
      act(() => player.simulateReady(30));

      expect(screen.getByText('0:00.0 / 0:30.0')).toBeInTheDocument();
    });
  });
});
