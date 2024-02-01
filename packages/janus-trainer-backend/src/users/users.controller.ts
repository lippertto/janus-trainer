import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  Put,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserListResponse, UserResponse } from './dto/user-response';
import { CreateUserRequest } from './dto/create-user-request';
import { Group, User } from './user.entity';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { UpdateUserRequest } from './dto/update-user-request';

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
    @Body() createRequest: CreateUserRequest,
    @Req() request: Request,
  ): Promise<User> {
    this.authService.requireGroup(request, [Group.ADMINS]);

    if (
      createRequest.groups.indexOf(Group.TRAINERS) !== -1 &&
      !createRequest.iban
    ) {
      throw new BadRequestException(
        "To assign the role 'trainer', an IBAN has to be provided.",
      );
    }

    return await this.usersService.createUser(
      createRequest.name,
      createRequest.email,
      createRequest.groups,
      createRequest.iban,
    );
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() updateRequest: UpdateUserRequest,
  ): Promise<UserResponse> {
    this.authService.requireGroup(request, [Group.ADMINS]);
    return await this.usersService.updateUser(
      id,
      updateRequest.name,
      updateRequest.email,
      updateRequest.groups,
      updateRequest.iban,
    );
  }

  @Get()
  async listUsers(@Req() request: Request): Promise<UserListResponse> {
    this.authService.requireGroup(request, [Group.ADMINS]);
    const users = await this.usersService.listUsers();

    return { value: users };
  }
}
