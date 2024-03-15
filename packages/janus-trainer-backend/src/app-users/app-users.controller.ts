import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Request } from 'express';
import { AppUserDto, Group } from 'janus-trainer-dto';
import { AppUsersService } from './app-users.service';

@Controller('app-users')
export class AppUsersController {
  constructor(
    private readonly appUsersService: AppUsersService,
    private readonly authService: AuthService,
  ) {}

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<AppUserDto> {
    this.authService.requireGroup(request, [Group.ADMINS, Group.TRAINERS]);
    const result = await this.appUsersService.queryMemberById(id);
    if (result === null) {
      throw new NotFoundException(`No profile with id ${id} was found`);
    } else {
      return result;
    }
  }
}
