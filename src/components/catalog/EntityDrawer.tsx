import { Dialog } from '@base-ui/react/dialog';
import { ExternalLinkIcon, Loader2Icon, LockIcon, XIcon } from 'lucide-react';
import { type File as CatalogFile, formatArocapiError, getProvider, itemCatalogUrl, type ProviderId, useEntity, useFiles } from '@/lib/arocapi';
import { formatBytes } from '@/lib/utils';

interface EntityDrawerProps {
  providerId: ProviderId;
  entityId: string | null;
  open: boolean;
  onClose: () => void;
  onLoadFile: (file: CatalogFile) => void;
}

export const EntityDrawer = ({ providerId, entityId, open, onClose, onLoadFile }: EntityDrawerProps) => {
  const provider = getProvider(providerId);
  const entityQuery = useEntity(providerId, entityId);
  const filesQuery = useFiles(providerId, entityId);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
    }
  };

  const entity = entityQuery.data;
  const files = filesQuery.data?.files ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Popup
          className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[480px] flex-col bg-background shadow-2xl ring-1 ring-border data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right"
          aria-label="Catalog item details"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border p-4">
            <Dialog.Title className="truncate font-semibold text-base">{entityQuery.isLoading ? 'Loading…' : (entity?.name ?? 'Catalog item')}</Dialog.Title>
            <Dialog.Close
              render={
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              }
            />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {entityQuery.error ? (
              <p className="text-destructive text-sm">{formatArocapiError(entityQuery.error)}</p>
            ) : entityQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2Icon className="h-4 w-4 animate-spin" /> Loading item…
              </div>
            ) : entity ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  {entity.description && <p className="text-foreground/80 text-sm">{entity.description}</p>}
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="break-all font-mono">{entity.id}</dd>
                    {entity.memberOf && (
                      <>
                        <dt className="text-muted-foreground">Collection</dt>
                        <dd className="truncate">{entity.memberOf.name}</dd>
                      </>
                    )}
                  </dl>
                  {provider && (
                    <a
                      href={itemCatalogUrl(provider, entity.id)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-foreground/80 text-xs hover:underline"
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                      Open in {provider.label}
                    </a>
                  )}
                </div>

                <section className="space-y-2">
                  <h3 className="font-semibold text-sm">Media files</h3>
                  {filesQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2Icon className="h-4 w-4 animate-spin" /> Loading files…
                    </div>
                  ) : filesQuery.error ? (
                    <p className="text-destructive text-xs">{formatArocapiError(filesQuery.error)}</p>
                  ) : files.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No media files attached to this item.</p>
                  ) : (
                    <ul className="space-y-2">
                      {files.map((file) => {
                        const locked = file.access?.content === false;
                        const enrollUrl = file.access?.contentAuthorizationUrl;
                        return (
                          <li key={file.id} className="flex items-center justify-between gap-3 rounded border border-border p-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate font-medium text-sm">
                                {locked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                <span className="truncate">{file.filename}</span>
                              </p>
                              <p className="truncate text-muted-foreground text-xs">
                                {file.mediaType}
                                {typeof file.size === 'number' && ` · ${formatBytes(file.size)}`}
                              </p>
                            </div>
                            {locked ? (
                              enrollUrl ? (
                                <a
                                  href={enrollUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-input bg-background px-3 font-medium text-xs hover:bg-muted"
                                >
                                  Request access
                                  <ExternalLinkIcon className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="inline-flex h-7 shrink-0 items-center rounded border border-input bg-muted/50 px-3 font-medium text-muted-foreground text-xs">
                                  Restricted
                                </span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => onLoadFile(file)}
                                className="inline-flex h-7 shrink-0 items-center rounded border border-input bg-background px-3 font-medium text-xs hover:bg-muted"
                              >
                                Load
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
