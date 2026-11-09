import { describe, expect, test } from 'vitest';
import { safeCallbackUrl } from '@/lib/callback-url';

describe('safeCallbackUrl', () => {
  test.each([
    ['/', '/'],
    ['/enter', '/enter'],
    ['/approve?course=7&x=1', '/approve?course=7&x=1'],
    ['/a/b#frag', '/a/b#frag'],
  ])('accepts the same-origin path %s', (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });

  test.each([
    ['https://evil.example'],
    ['http://evil.example/x'],
    ['//evil.example'],
    ['///evil.example'],
    ['/\\evil.example'],
    ['\\\\evil.example'],
    ['\\evil.example'],
    ['/\t/evil.example'],
    ['/\n/evil.example'],
    ['javascript:alert(1)'],
    ['data:text/html,x'],
    ['evil.example'],
    ['enter'],
    [' /enter'],
    [''],
  ])('rejects %j and falls back to /', (input) => {
    expect(safeCallbackUrl(input)).toBe('/');
  });

  test.each([[null], [undefined]])('falls back to / for %s', (input) => {
    expect(safeCallbackUrl(input)).toBe('/');
  });

  test('does not redirect back to /login itself', () => {
    expect(safeCallbackUrl('/login')).toBe('/');
    expect(safeCallbackUrl('/login?callbackUrl=%2Fenter')).toBe('/');
  });

  test('rejects control characters anywhere', () => {
    expect(safeCallbackUrl('/enter\r\nSet-Cookie: x=y')).toBe('/');
  });
});
