import { AlertCircleIcon, LockIcon } from 'lucide-react';
import { formatArocapiError, type SearchEntity } from '@/lib/arocapi';

interface ResultsListProps {
  entities: SearchEntity[];
  loading: boolean;
  error: unknown;
  total: number;
  searchTime: number;
  onSelect: (entityId: string) => void;
}

const ResultSkeleton = () => (
  <div className="space-y-2 rounded-lg border border-border p-3">
    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
    <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
  </div>
);

export const ResultsList = ({ entities, loading, error, total, searchTime, onSelect }: ResultsListProps) => {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
        <AlertCircleIcon className="h-6 w-6 text-destructive" />
        <p className="font-medium text-sm">Could not load search results.</p>
        <p className="text-muted-foreground text-xs">{formatArocapiError(error)}</p>
      </div>
    );
  }

  if (loading && entities.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed skeleton placeholders
          <ResultSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">No results. Try fewer filters or a different query.</div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        {total.toLocaleString()} result{total === 1 ? '' : 's'} in {searchTime} ms
      </p>
      <ul className="space-y-2">
        {entities.map((entity) => {
          const contentLocked = entity.access?.content === false;
          return (
            <li key={entity.id}>
              <button
                type="button"
                onClick={() => onSelect(entity.id)}
                className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="flex min-w-0 items-center gap-1.5 truncate font-medium text-sm">
                    {contentLocked && <LockIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Content restricted" />}
                    <span className="truncate">{entity.name || 'Untitled'}</span>
                  </h3>
                  <span className="shrink-0 text-muted-foreground text-xs italic">{entity.id}</span>
                </div>
                {entity.description && <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{entity.description}</p>}
                {entity.memberOf?.name && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    In <span className="font-medium text-foreground/80">{entity.memberOf.name}</span>
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
