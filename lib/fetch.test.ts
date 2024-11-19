import { buildQueryString } from '@/lib/fetch';
import { describe, expect, test } from 'vitest';

describe('fetchSingleEntity', () => {
  test('empty components result in empty string', () => {
    const result = buildQueryString([]);
    expect(result).toBe('');
  });

  test('one component has only question mark', () => {
    const result = buildQueryString(['a=b']);
    expect(result).toBe('?a=b');
  });

  test('second component is joined with ampersand', () => {
    const result = buildQueryString(['a=b', 'c=d']);
    expect(result).toBe('?a=b&c=d');
  });

  test('three components have two ampersands', () => {
    const result = buildQueryString(['a=b', 'c=d', 'e=f']);
    expect(result).toBe('?a=b&c=d&e=f');
  });
});
