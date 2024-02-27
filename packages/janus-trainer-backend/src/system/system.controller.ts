import {
  Controller,
  Get,
  MethodNotAllowedException,
  Req,
} from '@nestjs/common';
import { Group } from 'janus-trainer-dto';

import { AuthService } from '../auth/auth.service';

import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly authService: AuthService,
    private readonly systemService: SystemService,
  ) {}

  @Get('clear-database')
  async clearDatabases(@Req() httpRequest) {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);
    if (process.env.NODE_ENV === 'production') {
      throw new MethodNotAllowedException(
        'Databases cannot be cleaned on production',
      );
    }
    await this.systemService.clearDatabases();
  }
}
