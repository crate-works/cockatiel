// Custom search-param (de)serialisation for the router.
//
// We deliberately avoid TanStack's default JSON encoding for arrays so catalog
// facet filters round-trip as readable, collision-free repeated keys:
//
//   ?f_collection_title=NT1&f_collection_title=NT12&page=2
//
// rather than a URL-encoded JSON blob. Repeated keys (not comma-joining) keep
// values that contain commas — e.g. collection or collector names — intact.

// Parse a `?a=1&a=2&b=3` search string into a record. A key seen more than once
// becomes a string[]; a key seen once stays a string. Consumers that always want
// an array (the facet filters) normalise in their own validateSearch.
export const parseSearch = (searchStr: string): Record<string, unknown> => {
  const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr);
  const out: Record<string, unknown> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
};

// Inverse of parseSearch. Arrays serialise as repeated keys; strings pass
// through; everything else (numbers, booleans) is stringified. null/undefined
// and empty arrays are dropped so defaults never appear in the URL.
export const stringifySearch = (search: Record<string, unknown>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value == null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) {
          params.append(key, String(item));
        }
      }
    } else {
      params.append(key, typeof value === 'string' ? value : String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : '';
};
