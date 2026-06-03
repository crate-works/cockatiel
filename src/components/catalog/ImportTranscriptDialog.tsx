import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// 'import'  → bring the transcript in (no existing session)
// 'replace' → overwrite the existing saved session with the transcript
// 'plain'   → load without importing (auto-segment, or reopen the saved session)
// 'cancel'  → dismiss, load nothing
export type ImportChoice = 'import' | 'replace' | 'plain' | 'cancel';

interface ImportTranscriptDialogProps {
  open: boolean;
  mediaFilename: string;
  transcriptFilename: string;
  hasExisting: boolean;
  onChoose: (choice: ImportChoice) => void;
}

export const ImportTranscriptDialog = ({ open, mediaFilename, transcriptFilename, hasExisting, onChoose }: ImportTranscriptDialogProps) => {
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onChoose('cancel');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{hasExisting ? 'Replace your saved session?' : 'Import existing transcript?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {hasExisting ? (
              <>
                <span className="font-mono">{mediaFilename}</span> has an ELAN transcript (<span className="font-mono">{transcriptFilename}</span>) in the
                catalog, and you already have a saved session for this recording. Reopen your saved work, or replace it with the catalog transcript.
              </>
            ) : (
              <>
                <span className="font-mono">{mediaFilename}</span> has an existing ELAN transcript (<span className="font-mono">{transcriptFilename}</span>) in
                the catalog. Bring it in as editable segments, or segment the audio automatically instead.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {hasExisting ? (
            <>
              <Button variant="outline" onClick={() => onChoose('plain')}>
                Reopen saved session
              </Button>
              <Button onClick={() => onChoose('replace')}>Replace with transcript</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onChoose('plain')}>
                Auto-segment
              </Button>
              <Button onClick={() => onChoose('import')}>Import transcript</Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
