import type { Facets } from '@/lib/arocapi';

// Friendly labels for the facet keys we surface. If the live arocapi index
// uses different keys, update this mapping (and the store filters accordingly).
const FACET_LABELS: Record<string, string> = {
  languages_with_code: 'Languages',
  collection_title: 'Collections',
  countries: 'Countries',
  collector_name: 'Collectors',
};

const FACET_ORDER: string[] = ['languages_with_code', 'collection_title', 'countries', 'collector_name'];

interface FacetSidebarProps {
  facets: Facets | undefined;
  selectedFilters: Record<string, string[]>;
  onChange: (filters: Record<string, string[]>) => void;
  loading: boolean;
}

const toggleValue = (filters: Record<string, string[]>, key: string, value: string): Record<string, string[]> => {
  const current = filters[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const updated = { ...filters, [key]: next };
  if (updated[key].length === 0) {
    delete updated[key];
  }
  return updated;
};

export const FacetSidebar = ({ facets, selectedFilters, onChange, loading }: FacetSidebarProps) => {
  const orderedKeys = FACET_ORDER.filter((key) => facets?.[key]?.length);

  if (loading && !facets) {
    return (
      <aside className="space-y-3" aria-label="Filters">
        {FACET_ORDER.map((key) => (
          <div key={key} className="space-y-1">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" />
          </div>
        ))}
      </aside>
    );
  }

  if (orderedKeys.length === 0) {
    return null;
  }

  return (
    <aside className="space-y-4" aria-label="Filters">
      {orderedKeys.map((key) => {
        const buckets = facets?.[key] ?? [];
        const selected = selectedFilters[key] ?? [];
        return (
          <section key={key} className="space-y-1">
            <h3 className="font-semibold text-sm">{FACET_LABELS[key] ?? key}</h3>
            <ul className="space-y-1">
              {buckets.slice(0, 10).map((bucket) => {
                const isChecked = selected.includes(bucket.name);
                return (
                  <li key={bucket.name}>
                    <label className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <input type="checkbox" checked={isChecked} onChange={() => onChange(toggleValue(selectedFilters, key, bucket.name))} />
                        <span className="truncate">{bucket.name}</span>
                      </span>
                      <span className="text-muted-foreground text-xs">{bucket.count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </aside>
  );
};
