import { Logger, Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { config } from './config';
import { APP_GUARD } from '@nestjs/core';
import { CognitoJwtGuard } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { Training } from './trainings/training.entity';
import { User } from './users/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingsModule } from './trainings/trainings.module';
import { CompensationsModule } from './compensations/compensations.module';

import { UsersModule } from './users/users.module';
import { TrainersModule } from './trainers/trainers.module';
import { DisciplineModule } from './disciplines/disciplines.module';
import { Discipline } from './disciplines/discipline.entity';
import { HolidaysModule } from './holidays/holidays.module';
import { Holiday } from './holidays/holiday.entity';
import { SharedModule } from './shared/shared.module';
import { SystemModule } from './system/system.module';
import { WinstonModule } from 'nest-winston';
const providers: Provider[] = [Logger];

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
        entities: [Training, User, Discipline, Holiday],
      }),
    }),
    WinstonModule.forRoot(config().winston),
    TrainingsModule,
    CompensationsModule,
    UsersModule,
    TrainersModule,
    DisciplineModule,
    HolidaysModule,
    SharedModule,
    SystemModule,
  ],
  providers: providers,
})
export class AppModule {}
