import 'next-auth';
import 'next-auth/jwt';

// Fields that the credentials provider's authorize() puts on the User, and that the jwt callback
// copies into the token. See specs/003-custom-login-page/research.md, Decision 3.
declare module 'next-auth' {
  interface User {
    groups?: string[];
    accessToken?: string;
    refreshToken?: string;
    /** Epoch milliseconds. */
    accessTokenExpires?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    /** Epoch milliseconds. */
    accessTokenExpires?: number;
    groups?: string[];
    error?: 'RefreshAccessTokenError';
  }
}
