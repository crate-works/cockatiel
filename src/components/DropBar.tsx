import { PlusIcon, UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUPPORTED_FORMATS_LABEL, useAudioFilePicker } from '@/hooks/useAudioFilePicker';
import { cn } from '@/lib/utils';

interface DropBarProps {
  onFileSelected: (file: File, handle?: FileSystemFileHandle) => void;
}

export const DropBar = ({ onFileSelected }: DropBarProps) => {
  const { getRootProps, getInputProps, isDragActive, handleChoose } = useAudioFilePicker({ onFileSelected });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3 transition-colors',
        isDragActive ? 'border-accent bg-accent/5' : 'border-border',
      )}
    >
      <input {...getInputProps()} />
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <UploadIcon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {isDragActive ? 'Drop an audio or video file to open in editor' : 'Drop an audio or video file to start transcribing'}
        </p>
        <p className="text-xs text-muted-foreground">{SUPPORTED_FORMATS_LABEL} · one file at a time</p>
      </div>
      <Button size="sm" onClick={handleChoose}>
        <PlusIcon className="h-3.5 w-3.5" />
        Choose file
      </Button>
    </div>
  );
};
