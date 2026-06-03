import { ArrowLeftIcon } from 'lucide-react';
import { useMemo } from 'react';
import { ProviderAuthChip } from '@/components/auth/ProviderAuthChip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranscriptImport } from '@/hooks/useTranscriptImport';
import { type CatalogSource, listProviders, type ProviderId, type SearchRequest, useSearchEntities } from '@/lib/arocapi';
import type { TranscriptImportOptions } from '@/lib/import/types';
import { setLastProviderId } from '@/lib/preferences';
import { useAppStore } from '@/lib/store';
import { EntityDrawer } from './EntityDrawer';
import { FacetSidebar } from './FacetSidebar';
import { ImportTranscriptDialog } from './ImportTranscriptDialog';
import { Pagination } from './Pagination';
import { ResultsList } from './ResultsList';
import { SearchInput } from './SearchInput';

const PAGE_SIZE = 50;

// TODO(verify): confirm against the live PARADISEC index. arocapi's `filters` map to
// OpenSearch `terms` queries (exact match — wildcards become literal strings, so
// "audio/*" matches nothing). Enumerate the audio MIME types PARADISEC stores. Wrong
// values silently produce zero results; inspect a live response in devtools to confirm.
const FIXED_FILTERS: Record<string, string[]> = {
  entity_type: ['Item'],
  mediaType: ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg', 'audio/mp4'],
};

interface CatalogSearchPageProps {
  onLoadCatalog: (source: CatalogSource, options?: TranscriptImportOptions) => Promise<void>;
}

export const CatalogSearchPage = ({ onLoadCatalog }: CatalogSearchPageProps) => {
  const { providerId, query, filters, page, selectedEntityId, drawerOpen } = useAppStore((s) => s.catalogSearch);
  const exitCatalogSearch = useAppStore((s) => s.exitCatalogSearch);
  const setCatalogProvider = useAppStore((s) => s.setCatalogProvider);
  const setCatalogQuery = useAppStore((s) => s.setCatalogQuery);
  const setCatalogFilters = useAppStore((s) => s.setCatalogFilters);
  const setCatalogPage = useAppStore((s) => s.setCatalogPage);
  const openCatalogEntity = useAppStore((s) => s.openCatalogEntity);
  const closeCatalogDrawer = useAppStore((s) => s.closeCatalogDrawer);

  // Loading a catalog file first checks the item's RO-Crate for an existing transcript
  // and, if present, prompts the user to bring it across (see useTranscriptImport).
  const { dialog: importDialog, requestLoad, resolveDialog } = useTranscriptImport({ onLoadCatalog });

  const providers = listProviders();
  const provider = providers.find((p) => p.id === providerId) ?? providers[0];

  const request = useMemo<SearchRequest>(
    () => ({
      query,
      filters: { ...FIXED_FILTERS, ...filters },
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [query, filters, page],
  );

  const search = useSearchEntities(provider.id, request, { enabled: query.length > 0 || Object.keys(filters).length > 0 });
  const entities = search.data?.entities ?? [];
  const total = search.data?.total ?? 0;
  const searchTime = search.data?.searchTime ?? 0;
  const facets = search.data?.facets;

  const handleProviderChange = (next: string | null) => {
    if (next === null || next === providerId) {
      return;
    }
    setCatalogProvider(next as ProviderId);
    setLastProviderId(next as ProviderId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={exitCatalogSearch}>
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </Button>
          <h1 className="font-semibold text-lg">Catalog search</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={provider.id} onValueChange={handleProviderChange} items={providers.map((p) => ({ value: p.id, label: p.label }))}>
            <SelectTrigger size="sm" aria-label="Catalog provider">
              <SelectValue placeholder="Select catalog" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ProviderAuthChip providerId={provider.id} />
        </div>
      </div>

      <SearchInput initialValue={query} onQueryChange={setCatalogQuery} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <FacetSidebar facets={facets} selectedFilters={filters} onChange={setCatalogFilters} loading={search.isFetching} />
        <div className="min-w-0 space-y-4">
          {!query && Object.keys(filters).length === 0 ? (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
              Start typing to search the {provider.label} catalog.
            </div>
          ) : (
            <>
              <ResultsList
                entities={entities}
                loading={search.isFetching}
                error={search.error}
                total={total}
                searchTime={searchTime}
                onSelect={openCatalogEntity}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setCatalogPage} />
            </>
          )}
        </div>
      </div>

      <EntityDrawer providerId={providerId} entityId={selectedEntityId} open={drawerOpen} onClose={closeCatalogDrawer} onLoadFile={requestLoad} />

      <ImportTranscriptDialog
        open={importDialog !== null}
        mediaFilename={importDialog?.mediaFilename ?? ''}
        transcriptFilename={importDialog?.transcriptFilename ?? ''}
        hasExisting={importDialog?.hasExisting ?? false}
        onChoose={resolveDialog}
      />
    </div>
  );
};
