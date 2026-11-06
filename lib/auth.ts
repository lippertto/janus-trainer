import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import type { AuthOptions, NextAuthOptions, Profile, Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CognitoProvider from 'next-auth/providers/cognito';
import CredentialsProvider from 'next-auth/providers/credentials';
import { readLoginTicket } from './login-ticket';
import { Group } from './dto';
import { retry } from '@lifeomic/attempt';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@/app/api/users/cognito-client';
import { decodeIdToken } from '@/app/api/users/cognito-auth';

/**
 * Takes a token, and returns a new token with updated `accessToken`, `accessTokenExpires` and
 * `groups`. If an error occurs, returns the old token and an error property.
 *
 * Talks to Cognito through the SDK, so it works for sessions from both sign-in paths and does
 * not depend on the Hosted UI domain. See specs/003-custom-login-page/research.md, Decision 4.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await cognitoClient().send(
      new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID!,
        AuthParameters: { REFRESH_TOKEN: token.refreshToken as string },
      }),
    );
    const result = response.AuthenticationResult;
    if (!result?.AccessToken || !result.ExpiresIn) {
      throw new Error('Cognito returned no authentication result');
    }

    return {
      ...token,
      accessToken: result.AccessToken,
      accessTokenExpires: Date.now() + result.ExpiresIn * 1000,
      // Cognito returns a new refresh token only if rotation is enabled
      refreshToken: result.RefreshToken ?? token.refreshToken,
      groups: result.IdToken
        ? decodeIdToken(result.IdToken).groups
        : token.groups,
    };
  } catch (error) {
    // Log only the error type: the message could contain token material.
    console.log(
      `Token refresh failed: ${error instanceof Error ? error.name : 'unknown error'}`,
    );
    return {
      ...token,
      error: 'RefreshAccessTokenError' as const,
    };
  }
}

function getIssuer() {
  if (process.env.COGNITO_REGION) {
    return `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
  } else if (process.env.AWS_REGION) {
    return `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
  } else {
    return 'NO ISSUER SET! CHECK ENVIRONMENT VARIABLES!';
  }
}

async function doCheckIfUserExists(userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/users/${userId}`,
      {
        method: 'HEAD',
      },
    );
    if (response.status >= 500) {
      return Promise.reject(new Error(`Bad status code: ${response.status}`));
    }
    return response.status === 200;
  } catch (e) {
    return Promise.reject(e);
  }
}

async function checkIfUserExists(userId: string) {
  return retry(() => doCheckIfUserExists(userId));
}

export function buildAuthConfig(): AuthOptions {
  // configuration according to https://github.com/nextauthjs/next-auth/issues/4707
  return {
    pages: { signIn: '/login' },
    providers: [
      CognitoProvider({
        clientId: process.env.COGNITO_CLIENT_ID!,
        // @ts-expect-error: we actually have to pass null in here.
        clientSecret: null,
        issuer: getIssuer(),
        client: {
          token_endpoint_auth_method: 'none',
        },
        profile(profile) {
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
          };
        },
      }),
      // Accepts only the encrypted login ticket that the /api/auth/sign-in and
      // /api/auth/respond-to-new-password-challenge routes hand out. It must never accept raw
      // Cognito tokens. It deliberately does not call checkIfUserExists(): the signIn callback
      // below is the single enforcement point for that.
      CredentialsProvider({
        name: 'Credentials',
        credentials: { ticket: { type: 'text' } },
        async authorize(credentials) {
          const ticket = await readLoginTicket(credentials?.ticket);
          if (!ticket) return null;
          return {
            id: ticket.sub,
            name: ticket.name,
            email: ticket.email,
            groups: ticket.groups,
            accessToken: ticket.accessToken,
            refreshToken: ticket.refreshToken,
            accessTokenExpires: Date.now() + ticket.expiresIn * 1000,
          };
        },
      }),
    ],
    callbacks: {
      async signIn({ account }) {
        const ok = await checkIfUserExists(account?.providerAccountId ?? '');
        if (!ok) {
          console.log(`Cognito knows user, but the backend does not like it`);
        }
        return ok;
      },
      async session({ session, token }: { session: Session; token: JWT }) {
        const janusSession = session as JanusSession;
        janusSession.accessToken = token.accessToken as string;
        janusSession.name = token.name as string;
        janusSession.userId = token.sub!;
        janusSession.groups = (token.groups || []) as Group[];
        if (token.error) {
          janusSession.error = token.error;
        }

        return session;
      },
      // store the access token to the session
      async jwt({ token, user, account, profile }) {
        // initial login
        if (account && user) {
          if (!profile) {
            console.log('No profile provided. This should not happen.');
            return token;
          }
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          // expires_at is already an epoch in seconds
          token.accessTokenExpires = account.expires_at! * 1000;
          // Cognito always provides the groups in the profile
          token.groups = profile[
            'cognito:groups' as keyof Profile
          ] as any as Group[];
          return token;
        }

        // Return previous token if the access token has not expired yet
        if (Date.now() < (token.accessTokenExpires as number)) {
          return token;
        }

        // Access token has expired, try to update it
        return refreshAccessToken(token);
      },
    },
  } satisfies NextAuthOptions;
}

// Use it in server contexts
export async function auth(
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
): Promise<JanusSession> {
  return (await getServerSession(
    ...args,
    buildAuthConfig(),
  )) as any as JanusSession;
}

export interface JanusSession extends Session {
  userId: string;
  accessToken: string;
  name: string;
  groups: Group[];
  error?: 'RefreshAccessTokenError';
}
