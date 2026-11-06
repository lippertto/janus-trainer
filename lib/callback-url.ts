/**
 * Returns the callback URL only if it is a same-origin relative path, otherwise '/'.
 * Protects the login page against open redirects. See research Decision 16.
 */
export function safeCallbackUrl(candidate: string | null | undefined): string {
  if (!candidate) return '/';
  // Control characters (tab, newline, ...) are stripped by URL parsers, so '/\t/evil.example'
  // could turn into '//evil.example'.
  if (/[\u0000-\u001f\u007f]/.test(candidate)) return '/';
  // Must start with exactly one '/'. A backslash after it is treated as a '/' by browsers.
  if (!candidate.startsWith('/')) return '/';
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return '/';
  // Returning to the login page would loop.
  if (candidate === '/login' || /^\/login[?#/]/.test(candidate)) return '/';
  return candidate;
}
