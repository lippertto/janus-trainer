import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { User, Group } from '../users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// stolen from https://developer.mozilla.org/en-US/docs/Glossary/Base64
function base64ToBytes(base64) {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /** Parses the given request object and returns the contained information. */
  parseRequest(request: Request): ParsedAuthToken {
    // validity of the JWT was ensured by the guard
    const bearerToken: string = request.headers['authorization'];
    if (!bearerToken) {
      throw new ForbiddenException('No authorization header was provided.');
    }
    const token = bearerToken.substring(7);
    const [_1, payload, _2] = token.split('.');
    const structuredPayload = JSON.parse(
      new TextDecoder().decode(base64ToBytes(payload)),
    );

    return {
      groups: structuredPayload['cognito:groups'],
      userId: structuredPayload['sub'],
    };
  }

  /** Will throw when the given group does not exist in the groups of the request's header */
  requireGroup(request: Request, allowedGroups: Group[]) {
    const { groups } = this.parseRequest(request);
    for (const userGroup of groups) {
      if (allowedGroups.indexOf(userGroup) !== -1) {
        return;
      }
    }
    throw new ForbiddenException(
      `Must be member of any of the groups ${JSON.stringify(
        allowedGroups,
      )} for this operation.`,
    );
  }

  async cognitoIdIsKnown(cognitoId: string): Promise<boolean> {
    const user = await this.userRepository.findOneBy({ id: cognitoId });
    return !!user;
  }
}

export type ParsedAuthToken = {
  groups: Group[];
  userId: string;
};

export class CognitoJwtGuard extends AuthGuard('jwt') {}
