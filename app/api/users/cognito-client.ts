import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

let instance: CognitoIdentityProviderClient | undefined;

export function createCognitoClient() {
  return new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? 'eu-north-1',
  });
}

export function cognitoClient() {
  if (!instance) {
    instance = createCognitoClient();
  }
  return instance;
}
