import { Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { config } from './config';
import { APP_GUARD } from '@nestjs/core';
import { CognitoJwtGuard } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { Training } from './trainings/trainings.entity';
import { User } from './users/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingsModule } from './trainings/trainings.module';
import { CompensationsModule } from './compensations/compensations.module';

import { UsersModule } from './users/users.module';
import { TrainersModule } from './trainers/trainers.module';
import { SportsModule } from './sports/sports.module';

const providers: Provider[] = [];

if (config().cors.origin && !config().cors.origin.includes('localhost')) {
  providers.push({ provide: APP_GUARD, useClass: CognitoJwtGuard });
}

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...config().typeorm,
        type: 'postgres',
        entities: [Training, User],
      }),
    }),
    TrainingsModule,
    CompensationsModule,
    UsersModule,
    TrainersModule,
    SportsModule,
  ],
  providers: providers,
})
export class AppModule {}
