import { decode, encode } from 'next-auth/jwt';

/**
 * A login ticket is a short-lived, encrypted bundle that the sign-in API routes hand to the browser
 * instead of Cognito tokens. The browser passes it on to NextAuth's credentials provider, which
 * decrypts it. See specs/003-custom-login-page/research.md, Decision 14.
 *
 * Never log a ticket or its payload.
 */
export type LoginTicketPayload = {
  sub: string;
  email: string;
  name: string;
  groups: string[];
  accessToken: string;
  refreshToken: string;
  /** Lifetime of the access token in seconds. */
  expiresIn: number;
};

// A dedicated salt makes the derived key differ from the one for session cookies (which use an
// empty salt), so a ticket is never accepted as a session and vice versa.
const SALT = 'janus-login-ticket';
const MAX_AGE_SECONDS = 60;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set');
  }
  return secret;
}

export async function createLoginTicket(
  payload: LoginTicketPayload,
): Promise<string> {
  return encode({
    token: { ...payload },
    secret: getSecret(),
    salt: SALT,
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Returns the payload, or null if the ticket is missing, tampered with, expired or malformed. */
export async function readLoginTicket(
  ticket: string | null | undefined,
): Promise<LoginTicketPayload | null> {
  if (!ticket) return null;
  try {
    const decoded = await decode({
      token: ticket,
      secret: getSecret(),
      salt: SALT,
    });
    if (!decoded) return null;

    // decode() tolerates 15 s of clock skew; the ticket lifetime is meant to be strict.
    if (typeof decoded.exp !== 'number' || decoded.exp * 1000 <= Date.now()) {
      return null;
    }

    const { sub, email, name, groups, accessToken, refreshToken, expiresIn } =
      decoded;
    if (
      typeof sub !== 'string' ||
      typeof email !== 'string' ||
      typeof name !== 'string' ||
      !Array.isArray(groups) ||
      !groups.every((g) => typeof g === 'string') ||
      typeof accessToken !== 'string' ||
      typeof refreshToken !== 'string' ||
      typeof expiresIn !== 'number'
    ) {
      return null;
    }
    return {
      sub,
      email,
      name,
      groups,
      accessToken,
      refreshToken,
      expiresIn,
    };
  } catch {
    return null;
  }
}
