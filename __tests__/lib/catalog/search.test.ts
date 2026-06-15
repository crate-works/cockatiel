import { describe, expect, it } from 'vitest';
import { type CatalogSearch, filtersFromSearch, filtersToSearch, validateCatalogSearch } from '@/lib/catalog/search';

describe('validateCatalogSearch', () => {
  it('keeps known params and omits defaults', () => {
    expect(validateCatalogSearch({ provider: 'paradisec', q: 'song', page: '3', entity: 'item-1' })).toEqual({
      provider: 'paradisec',
      q: 'song',
      page: 3,
      entity: 'item-1',
    });
  });

  it('drops page 1, empty query, and non-integer pages', () => {
    expect(validateCatalogSearch({ page: '1' })).toEqual({});
    expect(validateCatalogSearch({ q: '' })).toEqual({});
    expect(validateCatalogSearch({ page: 'abc' })).toEqual({});
  });

  it('normalises f_ facet keys to non-empty string arrays', () => {
    expect(validateCatalogSearch({ f_lang: 'eng' })).toEqual({ f_lang: ['eng'] });
    expect(validateCatalogSearch({ f_lang: ['eng', 'deu'] })).toEqual({ f_lang: ['eng', 'deu'] });
    expect(validateCatalogSearch({ f_lang: [] })).toEqual({});
  });
});

describe('filters <-> search', () => {
  it('extracts facet filters, stripping the f_ prefix', () => {
    const search: CatalogSearch = { q: 'x', f_collection_title: ['NT1'], f_languages_with_code: ['eng'] };
    expect(filtersFromSearch(search)).toEqual({ collection_title: ['NT1'], languages_with_code: ['eng'] });
  });

  it('round-trips through filtersToSearch', () => {
    const filters = { collection_title: ['NT1', 'NT12'], countries: ['Australia'] };
    expect(filtersFromSearch(filtersToSearch(filters) as CatalogSearch)).toEqual(filters);
  });

  it('omits empty facet selections', () => {
    expect(filtersToSearch({ collection_title: [] })).toEqual({});
  });
});
