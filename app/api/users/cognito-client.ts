import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

let instance: CognitoIdentityProviderClient | undefined;

function createCognitoClient(region: string) {
  return new CognitoIdentityProviderClient({
    region,
  });
}

export function cognitoClient() {
  if (!instance) {
    if (process.env.AWS_REGION) {
      instance = createCognitoClient(process.env.AWS_REGION);
    } else if (process.env.COGNITO_REGION) {
      instance = createCognitoClient(process.env.COGNITO_REGION);
    } else {
      throw new Error('AWS region not specified via environment variables');
    }
  }
  return instance;
}
