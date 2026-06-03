import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { getErrorMessage, isAbortError } from '@/lib/utils';
import { prewarm } from '@/lib/vad';

const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.ogv', '.mkv'];
const ACCEPT_MEDIA = { 'audio/*': AUDIO_EXTENSIONS, 'video/*': VIDEO_EXTENSIONS };

/** Human-friendly summary of accepted formats, shown in the drop targets. */
export const SUPPORTED_FORMATS_LABEL = 'WAV, MP3, FLAC, OGG, M4A · MP4, MOV, WEBM, MKV';

interface UseAudioFilePickerArgs {
  onFileSelected: (file: File, handle?: FileSystemFileHandle) => void;
}

export const useAudioFilePicker = ({ onFileSelected }: UseAudioFilePickerArgs) => {
  useEffect(() => {
    prewarm();
  }, []);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) {
        onFileSelected(accepted[0]);
      }
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT_MEDIA,
    maxFiles: 1,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  const handleChoose = useCallback(async () => {
    const picker = window.showOpenFilePicker;
    if (!picker) {
      open();
      return;
    }
    try {
      const [handle] = await picker({
        excludeAcceptAllOption: false,
        multiple: false,
        types: [{ accept: ACCEPT_MEDIA, description: 'Audio and video files' }],
      });
      if (!handle) {
        return;
      }
      const file = await handle.getFile();
      onFileSelected(file, handle);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('File picker failed:', error);
      toast.error(`Could not open file: ${getErrorMessage(error)}`);
    }
  }, [onFileSelected, open]);

  return { getRootProps, getInputProps, isDragActive, handleChoose };
};
