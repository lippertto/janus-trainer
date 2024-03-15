import { Module } from '@nestjs/common';
import { AppUsersController } from './app-users.controller';
import { AppUsersService } from './app-users.service';
import { AuthModule } from 'src/auth/auth.module';
import { AppackGraphQlClient } from './AppackGraphQlClient';

const APPACK_API = 'https://api.appack.de/graphql';

const API_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6InNjLWphbnVzIiwidXNlcm5hbWUiOiJsdHJkQGZhc3RtYWlsLmZtIiwiaXNzIjoiYXBwYWNrIiwiZXhwIjoxNzM1NjQ0MDgzLCJpYXQiOjE3MTA1MTgwNTEsInNjb3BlIjpbImdldF90b2tlbiJdfQ.F0Dt7KIYnlPJxz-AHjm07cOkbZlsZfykFEDZ8WmuRnGJ0olShJFBUYQBieH9GhVWDTYW_ZS3L5zIii9bFgF-ltc79e_xqMuWzeBDroytb1jIUkV_rKHZTK1-OFgEiNMRnlCmiDdJrkRbre0txH0WsdSj55iHucWArQM2k-LZBhcj9zXUItGL1RlE85NwFH9txd1EQt0ck-iZ-obOJQLoYqViKecYAjVdhsoaASIyTApS6lHDaDOWZHHLyEqhZG9G_TL84k_a5u9_2lWWZpW5ezW0SGSwHHFCjhdXgZMpbaIGXoC0P8kuntFtiP3vQhqjvqZs6EJrVm3Ra_pKQe6_hg';

@Module({
  imports: [AuthModule],
  controllers: [AppUsersController],
  providers: [
    AppUsersService,
    {
      provide: AppackGraphQlClient,
      useValue: new AppackGraphQlClient(APPACK_API, API_TOKEN),
    },
  ],
})
export class AppUsersModule {}
