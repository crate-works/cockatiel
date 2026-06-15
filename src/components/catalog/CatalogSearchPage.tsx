import { getRouteApi } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useAppShell } from '@/app-shell';
import { ProviderAuthChip } from '@/components/auth/ProviderAuthChip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranscriptImport } from '@/hooks/useTranscriptImport';
import { listProviders, type SearchRequest, useSearchEntities } from '@/lib/arocapi';
import { type CatalogSearch, filtersFromSearch, filtersToSearch } from '@/lib/catalog/search';
import { getLastProviderId, setLastProviderId } from '@/lib/preferences';
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

const routeApi = getRouteApi('/catalog');

// Strip the `f_<facet>` filter keys from a search object, leaving the rest.
const withoutFacets = (search: CatalogSearch): CatalogSearch =>
  Object.fromEntries(Object.entries(search).filter(([k]) => !k.startsWith('f_'))) as CatalogSearch;

export const CatalogSearchPage = () => {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { loadFromCatalog } = useAppShell();

  const providers = listProviders();
  // Provider comes from the URL; absent, fall back to the remembered/first one
  // without forcing it into the URL (a bare /catalog shared elsewhere then uses
  // the recipient's own default).
  const providerId = search.provider ?? getLastProviderId() ?? providers[0]?.id ?? '';
  const provider = providers.find((p) => p.id === providerId) ?? providers[0];
  const query = search.q ?? '';
  const page = search.page ?? 1;
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const selectedEntityId = search.entity ?? null;

  const setQuery = (next: string) => {
    navigate({ search: (prev) => ({ ...prev, q: next || undefined, page: undefined }) });
  };
  const setFilters = (next: Record<string, string[]>) => {
    navigate({ search: (prev) => ({ ...withoutFacets(prev), ...filtersToSearch(next), page: undefined }) });
  };
  const setPage = (next: number) => {
    navigate({ search: (prev) => ({ ...prev, page: next > 1 ? next : undefined }) });
  };
  const openEntity = (entityId: string) => {
    navigate({ search: (prev) => ({ ...prev, entity: entityId }) });
  };
  const closeDrawer = () => {
    navigate({ search: (prev) => ({ ...prev, entity: undefined }) });
  };
  const goBack = () => {
    navigate({ to: '/' });
  };
  const handleProviderChange = (next: string | null) => {
    if (next === null || next === providerId) {
      return;
    }
    setLastProviderId(next);
    // Switching catalog resets filters/page/open-entity (they belong to the old
    // provider); the free-text query carries over.
    navigate({ search: (prev) => ({ provider: next, ...(prev.q ? { q: prev.q } : {}) }) });
  };

  // Loading a catalog file first checks the item's RO-Crate for an existing transcript
  // and, if present, prompts the user to bring it across (see useTranscriptImport).
  const {
    dialog: importDialog,
    requestLoad,
    resolveDialog,
  } = useTranscriptImport({
    onLoadCatalog: loadFromCatalog,
    providerId,
    entityId: selectedEntityId,
    onClose: closeDrawer,
  });

  const request = useMemo<SearchRequest>(
    () => ({
      query,
      filters: { ...FIXED_FILTERS, ...filters },
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [query, filters, page],
  );

  const searchResult = useSearchEntities(provider?.id ?? '', request, {
    enabled: Boolean(provider) && (query.length > 0 || Object.keys(filters).length > 0),
  });
  const entities = searchResult.data?.entities ?? [];
  const total = searchResult.data?.total ?? 0;
  const searchTime = searchResult.data?.searchTime ?? 0;
  const facets = searchResult.data?.facets;

  // Defensive: the catalog entry points are hidden when no providers are
  // configured, so this is normally unreachable — but never render with no provider.
  if (!provider) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">No catalogs are configured for this deployment.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goBack}>
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

      <SearchInput initialValue={query} onQueryChange={setQuery} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <FacetSidebar facets={facets} selectedFilters={filters} onChange={setFilters} loading={searchResult.isFetching} />
        <div className="min-w-0 space-y-4">
          {!query && Object.keys(filters).length === 0 ? (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
              Start typing to search the {provider.label} catalog.
            </div>
          ) : (
            <>
              <ResultsList
                entities={entities}
                loading={searchResult.isFetching}
                error={searchResult.error}
                total={total}
                searchTime={searchTime}
                onSelect={openEntity}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <EntityDrawer providerId={provider.id} entityId={selectedEntityId} open={selectedEntityId !== null} onClose={closeDrawer} onLoadFile={requestLoad} />

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
