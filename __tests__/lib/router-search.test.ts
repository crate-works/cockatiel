import { describe, expect, it } from 'vitest';
import { parseSearch, stringifySearch } from '@/lib/router-search';

describe('router-search', () => {
  it('parses single values as strings and repeated keys as arrays', () => {
    expect(parseSearch('?q=hello&page=2')).toEqual({ q: 'hello', page: '2' });
    expect(parseSearch('?f_lang=eng&f_lang=deu')).toEqual({ f_lang: ['eng', 'deu'] });
  });

  it('tolerates a leading ? or its absence', () => {
    expect(parseSearch('q=hi')).toEqual({ q: 'hi' });
    expect(parseSearch('')).toEqual({});
  });

  it('serialises arrays as repeated keys and drops empties', () => {
    expect(stringifySearch({ q: 'hi', page: 2 })).toBe('?q=hi&page=2');
    expect(stringifySearch({ f_lang: ['eng', 'deu'] })).toBe('?f_lang=eng&f_lang=deu');
    expect(stringifySearch({ q: undefined, page: null, f_x: [] })).toBe('');
  });

  it('round-trips values containing commas without splitting them', () => {
    const search = { f_collection_title: ['Smith, John', 'Other'] };
    const round = parseSearch(stringifySearch(search));
    expect(round).toEqual(search);
  });
});
