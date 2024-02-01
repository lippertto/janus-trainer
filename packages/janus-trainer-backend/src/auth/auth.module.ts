import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CognitoStrategy } from './cognito.strategy';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [AuthService, CognitoStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
