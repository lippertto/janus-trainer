import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { encode } from 'next-auth/jwt';
import {
  createLoginTicket,
  readLoginTicket,
  type LoginTicketPayload,
} from '@/lib/login-ticket';

const SECRET = 'a-test-secret-that-is-long-enough-for-hkdf';

const PAYLOAD: LoginTicketPayload = {
  sub: 'user-sub-1',
  email: 'trainer@example.com',
  name: 'Tina Trainer',
  groups: ['trainers'],
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
};

describe('login ticket', () => {
  beforeEach(() => {
    vi.stubEnv('NEXTAUTH_SECRET', SECRET);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  test('round trip returns the payload', async () => {
    const ticket = await createLoginTicket(PAYLOAD);
    const result = await readLoginTicket(ticket);
    expect(result).toEqual(PAYLOAD);
  });

  test('ticket is opaque: contains no payload values in clear text', async () => {
    const ticket = await createLoginTicket(PAYLOAD);
    expect(ticket).not.toContain('access-token');
    expect(ticket).not.toContain('refresh-token');
    expect(ticket).not.toContain(PAYLOAD.sub);
  });

  test('result contains only the expected fields', async () => {
    const ticket = await createLoginTicket(PAYLOAD);
    const result = await readLoginTicket(ticket);
    expect(Object.keys(result!).sort()).toEqual(
      [
        'accessToken',
        'email',
        'expiresIn',
        'groups',
        'name',
        'refreshToken',
        'sub',
      ].sort(),
    );
  });

  test('tampered ticket returns null', async () => {
    const ticket = await createLoginTicket(PAYLOAD);
    const last = ticket.slice(-1);
    const tampered = ticket.slice(0, -1) + (last === 'A' ? 'B' : 'A');
    expect(await readLoginTicket(tampered)).toBeNull();
  });

  test.each([undefined, null, '', 'not-a-jwe'])(
    'missing or garbage ticket (%s) returns null',
    async (ticket) => {
      expect(await readLoginTicket(ticket as any)).toBeNull();
    },
  );

  test('expired ticket returns null', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const ticket = await createLoginTicket(PAYLOAD);

    // still valid shortly before the 60 s lifetime ends
    vi.setSystemTime(new Date('2030-01-01T00:00:55Z'));
    expect(await readLoginTicket(ticket)).not.toBeNull();

    // next-auth's decode() tolerates 15 s of clock skew; the ticket must not
    vi.setSystemTime(new Date('2030-01-01T00:01:05Z'));
    expect(await readLoginTicket(ticket)).toBeNull();
  });

  test('ticket created with a different salt (session-cookie style) returns null', async () => {
    const sessionStyleToken = await encode({
      token: { ...PAYLOAD },
      secret: SECRET,
      maxAge: 60,
    });
    expect(await readLoginTicket(sessionStyleToken)).toBeNull();
  });

  test('ticket created with a different secret returns null', async () => {
    const ticket = await createLoginTicket(PAYLOAD);
    vi.stubEnv('NEXTAUTH_SECRET', 'another-secret-that-is-long-enough-xx');
    expect(await readLoginTicket(ticket)).toBeNull();
  });

  test('a login ticket is not accepted as a session token', async () => {
    const { decode } = await import('next-auth/jwt');
    const ticket = await createLoginTicket(PAYLOAD);
    await expect(decode({ token: ticket, secret: SECRET })).rejects.toThrow();
  });

  test('ticket with missing required fields returns null', async () => {
    const incomplete = await encode({
      token: { sub: 'x' },
      secret: SECRET,
      salt: 'janus-login-ticket',
      maxAge: 60,
    });
    expect(await readLoginTicket(incomplete)).toBeNull();
  });

  test('creating a ticket without NEXTAUTH_SECRET throws', async () => {
    vi.stubEnv('NEXTAUTH_SECRET', '');
    await expect(createLoginTicket(PAYLOAD)).rejects.toThrow(/NEXTAUTH_SECRET/);
  });
});
