import {
  Controller,
  Req,
  Post,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger();

  constructor(private authService: AuthService) {}

  @Post()
  async logIn(@Req() request: Request): Promise<void> {
    const { userId: cognitoId } = this.authService.parseRequest(request);

    if (await this.authService.cognitoIdIsKnown(cognitoId)) {
      this.logger.log(`Cognito id ${cognitoId} id known`);
      return;
    }
    this.logger.warn(`Cognito id ${cognitoId} is unknown`);
    throw new ForbiddenException('Your cognito id has not been registered');
  }
}
