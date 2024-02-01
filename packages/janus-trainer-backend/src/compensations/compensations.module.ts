import { Module } from '@nestjs/common';
import { CompensationsService } from './compensations.service';
import { Training } from '../trainings/trainings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompensationController } from './compensations.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Training]), AuthModule],
  providers: [CompensationsService],
  controllers: [CompensationController],
})
export class CompensationsModule {}
