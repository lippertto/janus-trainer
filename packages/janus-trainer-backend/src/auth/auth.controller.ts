import {
  Controller,
  Req,
  Post,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Post()
  async logIn(@Req() request: Request): Promise<void> {
    const { userId: cognitoId } = this.authService.parseRequest(request);

    if (await this.authService.cognitoIdIsKnown(cognitoId)) {
      this.logger.info(`Cognito id ${cognitoId} id known`);
      return;
    }
    this.logger.warn(`Cognito id ${cognitoId} is unknown`);
    throw new ForbiddenException('Your cognito id has not been registered');
  }
}
