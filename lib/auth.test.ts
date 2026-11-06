import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
} from '@aws-sdk/client-cognito-identity-provider';
import { buildAuthConfig } from '@/lib/auth';
import { fakeIdToken } from '@/app/api/users/cognito-test-utils';

function jwtCallback() {
  return buildAuthConfig().callbacks!.jwt!;
}

describe('jwt callback, OAuth sign-in', () => {
  test('accessTokenExpires is account.expires_at (epoch seconds) in milliseconds', async () => {
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600;

    const token = await jwtCallback()({
      token: { sub: 'user-1' },
      user: { id: 'user-1' },
      account: {
        provider: 'cognito',
        type: 'oauth',
        providerAccountId: 'user-1',
        access_token: 'oauth-access',
        refresh_token: 'oauth-refresh',
        expires_at: expiresAtSeconds,
      },
      profile: { sub: 'user-1', 'cognito:groups': ['admins'] } as any,
    });

    expect(token.accessTokenExpires).toBe(expiresAtSeconds * 1000);
    expect(token.accessToken).toBe('oauth-access');
    expect(token.refreshToken).toBe('oauth-refresh');
    expect(token.groups).toEqual(['admins']);
  });
});

describe('jwt callback, token refresh', () => {
  const cognitoMock = mockClient(CognitoIdentityProviderClient);

  beforeEach(() => {
    cognitoMock.reset();
    vi.stubEnv('AWS_REGION', 'eu-north-1');
    vi.stubEnv('COGNITO_CLIENT_ID', 'client-id');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const expiredToken = () => ({
    sub: 'user-1',
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    accessTokenExpires: Date.now() - 1000,
    groups: ['trainers'],
  });

  const callJwt = (token: any) =>
    jwtCallback()({ token, user: undefined as any, account: null });

  test('does not call Cognito while the access token is valid', async () => {
    const token = {
      ...expiredToken(),
      accessTokenExpires: Date.now() + 60_000,
    };
    const result = await callJwt(token);
    expect(result).toEqual(token);
    expect(cognitoMock.commandCalls(InitiateAuthCommand)).toHaveLength(0);
  });

  test('refreshes through InitiateAuth with REFRESH_TOKEN_AUTH', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: 'new-access',
        ExpiresIn: 3600,
        IdToken: fakeIdToken({
          sub: 'user-1',
          email: 'a@b.de',
          name: 'A',
          'cognito:groups': ['admins'],
        }),
      },
    });

    const before = Date.now();
    const result = await callJwt(expiredToken());

    const calls = cognitoMock.commandCalls(InitiateAuthCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: 'client-id',
      AuthParameters: { REFRESH_TOKEN: 'old-refresh' },
    });
    expect(result.accessToken).toBe('new-access');
    expect(result.accessTokenExpires).toBeGreaterThanOrEqual(
      before + 3_600_000,
    );
    expect(result.accessTokenExpires).toBeLessThanOrEqual(
      Date.now() + 3_600_000,
    );
    expect(result.groups).toEqual(['admins']);
    expect(result.error).toBeUndefined();
  });

  test('keeps the old refresh token if Cognito returns none', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: { AccessToken: 'new-access', ExpiresIn: 3600 },
    });
    const result = await callJwt(expiredToken());
    expect(result.refreshToken).toBe('old-refresh');
    // no IdToken in the response: keep the known groups
    expect(result.groups).toEqual(['trainers']);
  });

  test('uses a rotated refresh token if Cognito returns one', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: 'new-access',
        RefreshToken: 'rotated-refresh',
        ExpiresIn: 3600,
      },
    });
    const result = await callJwt(expiredToken());
    expect(result.refreshToken).toBe('rotated-refresh');
  });

  test('NotAuthorizedException yields RefreshAccessTokenError and keeps the token', async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(
      new NotAuthorizedException({
        message: 'Refresh Token has been revoked',
        $metadata: {},
      }),
    );
    const result = await callJwt(expiredToken());
    expect(result.error).toBe('RefreshAccessTokenError');
    expect(result.sub).toBe('user-1');
  });

  test('a response without AuthenticationResult is a refresh error', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({});
    const result = await callJwt(expiredToken());
    expect(result.error).toBe('RefreshAccessTokenError');
  });

  test('does not log tokens when refresh fails', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    cognitoMock
      .on(InitiateAuthCommand)
      .rejects(new NotAuthorizedException({ message: 'nope', $metadata: {} }));
    await callJwt(expiredToken());
    const logged = JSON.stringify([...log.mock.calls, ...err.mock.calls]);
    expect(logged).not.toContain('old-refresh');
    expect(logged).not.toContain('old-access');
    log.mockRestore();
    err.mockRestore();
  });
});
