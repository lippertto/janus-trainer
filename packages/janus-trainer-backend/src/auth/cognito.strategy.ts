import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { config } from '../config';
import { AuthService } from './auth.service';

@Injectable()
export class CognitoStrategy extends PassportStrategy(Strategy) {
  constructor(authService: AuthService) {
    super(
      {
        secretOrKeyProvider: passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: config().cognito.jwksUri ?? 'no-jwks-uri-provided',
        }),
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        issuer: config().cognito.issuer ?? 'no-issuer-provided',
        passReqToCallback: false,
      },
      function (jwt_payload, done) {
        const cognitoId = jwt_payload.sub;
        authService.cognitoIdIsKnown(cognitoId).then((ok) => {
          done(null, ok);
        });
      },
    );
  }
}
