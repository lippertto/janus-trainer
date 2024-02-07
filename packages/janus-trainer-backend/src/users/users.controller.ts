import {
  Controller,
  Post,
  Body,
  Delete,
  Req,
  Get,
  Param,
  Put,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UserListDto,
  UserDto,
  UserCreateRequestDto,
  UserUpdateRequestDto,
  Group,
} from 'janus-trainer-dto';
import { User } from './user.entity';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get(':id')
  async getUser(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<User | null> {
    this.authService.requireGroup(request, [Group.ADMINS]);
    const result = await this.usersService.findUserById(id);
    if (!result) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return result;
  }

  @Post()
  async createUser(
    @Body() request: UserCreateRequestDto,
    @Req() httpRequest: Request,
  ): Promise<UserDto> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);

    if (request.groups.indexOf(Group.TRAINERS) !== -1 && !request.iban) {
      throw new BadRequestException(
        "To assign the role 'trainer', an IBAN has to be provided.",
      );
    }

    return await this.usersService.createUser(
      request.name,
      request.email,
      request.groups,
      request.iban,
    );
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Req() httpRequest: Request,
    @Body() updateRequest: UserUpdateRequestDto,
  ): Promise<UserDto> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);
    return await this.usersService.updateUser(
      id,
      updateRequest.name,
      updateRequest.email,
      updateRequest.groups,
      updateRequest.iban,
    );
  }

  @Get()
  async listUsers(@Req() request: Request): Promise<UserListDto> {
    this.authService.requireGroup(request, [Group.ADMINS]);
    const users = await this.usersService.listUsers();

    return { value: users };
  }

  @Delete(':id')
  async deleteUser(
    @Req() httpRequest: Request,
    @Param('id') id: string,
  ): Promise<void> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS]);
    await this.usersService.deleteUser(id);
    throw new HttpException('OK', HttpStatus.NO_CONTENT);
  }
}
