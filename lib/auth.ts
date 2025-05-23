import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import type { AuthOptions, NextAuthOptions, Profile, Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CognitoProvider from 'next-auth/providers/cognito';
import { Group } from './dto';
import { retry } from '@lifeomic/attempt';

// refresh logic copied from https://github.com/nextauthjs/next-auth-refresh-token-example/blob/57f84dbc50f30233d4ee389c7239212858ecae14/pages/api/auth/%5B...nextauth%5D.js#L1
// TODO - update according to https://authjs.dev/guides/basics/refresh-token-rotation?frameworks=core
/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(token: JWT) {
  try {
    const url =
      'https://janus-trainer-app.auth.eu-north-1.amazoncognito.com/oauth2/token' +
      new URLSearchParams({
        client_id: process.env.COGNITO_CLIENT_ID!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      });

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.log(error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
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
    providers: [
      CognitoProvider({
        clientId: process.env.COGNITO_CLIENT_ID!,
        // @ts-expect-error: we actually have to pass null in here.
        clientSecret: null,
        issuer: getIssuer(),
        checks: process.env.DISABLE_JWT_CHECKS ? 'none' : undefined,
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
          token.accessTokenExpires = Date.now() + account.expires_at! * 1000;
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
}
