/** Builds an unsigned JWT-shaped string for tests. Never use outside of tests. */
export function fakeIdToken(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(claims)}.signature`;
}
