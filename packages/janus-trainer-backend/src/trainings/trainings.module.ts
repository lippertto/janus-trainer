import { Module } from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { Training } from './trainings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingsController } from './trainings.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DisciplineModule } from '../disciplines/disciplines.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Training]),
    UsersModule,
    AuthModule,
    DisciplineModule,
  ],
  providers: [TrainingsService],
  controllers: [TrainingsController],
})
export class TrainingsModule {}
