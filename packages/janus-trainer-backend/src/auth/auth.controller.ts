import { Controller, Req, Post, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post()
  async logIn(@Req() request: Request): Promise<void> {
    const { userId: cognitoId } = this.authService.parseRequest(request);

    if (await this.authService.cognitoIdIsKnown(cognitoId)) {
      return;
    }
    throw new ForbiddenException('Your cognito id has not been registered');
  }
}
