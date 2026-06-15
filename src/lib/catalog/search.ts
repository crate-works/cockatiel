// URL state for the /catalog route. The catalog search (provider, query, page,
// open entity, and facet filters) lives entirely in the URL so it's shareable,
// bookmarkable, and survives the OAuth sign-in round-trip.
//
// Facet filters are flat `f_<facetKey>` search params, each an array of selected
// bucket values (serialised as repeated keys — see lib/router-search.ts).

export interface CatalogSearch {
  provider?: string;
  q?: string;
  page?: number;
  entity?: string;
  // Facet filters: `f_<facetKey>` → selected values. Kept flat (rather than a
  // nested object) so each serialises to its own readable query key.
  [facet: `f_${string}`]: string[] | undefined;
}

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  return typeof value === 'string' && value.length > 0 ? [value] : [];
};

// Validate/normalise the raw parsed search record into a typed CatalogSearch.
// Defaults (page 1, empty query/filters) are omitted so a bare /catalog is clean.
export const validateCatalogSearch = (search: Record<string, unknown>): CatalogSearch => {
  const out: CatalogSearch = {};
  if (typeof search.provider === 'string' && search.provider) {
    out.provider = search.provider;
  }
  if (typeof search.q === 'string' && search.q) {
    out.q = search.q;
  }
  const page = Number(search.page);
  if (Number.isInteger(page) && page > 1) {
    out.page = page;
  }
  if (typeof search.entity === 'string' && search.entity) {
    out.entity = search.entity;
  }
  for (const [key, value] of Object.entries(search)) {
    if (key.startsWith('f_')) {
      const values = asStringArray(value);
      if (values.length > 0) {
        out[key as `f_${string}`] = values;
      }
    }
  }
  return out;
};

// Extract the facet filters as the `Record<facetKey, values>` shape the catalog
// API and FacetSidebar expect (stripping the `f_` prefix).
export const filtersFromSearch = (search: CatalogSearch): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(search)) {
    if (key.startsWith('f_') && Array.isArray(value) && value.length > 0) {
      out[key.slice(2)] = value;
    }
  }
  return out;
};

// Inverse of filtersFromSearch: turn a `Record<facetKey, values>` into the flat
// `f_<facetKey>` search-param shape.
export const filtersToSearch = (filters: Record<string, string[]>): Record<`f_${string}`, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(filters)) {
    if (values.length > 0) {
      out[`f_${key}`] = values;
    }
  }
  return out as Record<`f_${string}`, string[]>;
};
