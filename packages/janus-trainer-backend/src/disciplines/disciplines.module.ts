import { Module } from '@nestjs/common';
import { DisciplinesController } from './disciplines.controller';
import { DisciplineService } from './discliplines.service';
import { AuthModule } from '../auth/auth.module';
import { Discipline } from './discipline.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Discipline])],
  controllers: [DisciplinesController],
  providers: [DisciplineService],
})
export class DisciplineModule {}
