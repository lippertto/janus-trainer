import { Get, Controller, Req, Query } from '@nestjs/common';
import { TrainersService } from './trainers.service';
import { TrainerQueryRequest } from './dto/trainer-query-request';
import { AuthService } from '../auth/auth.service';
import { Group } from '../users/user.entity';
import { Request } from 'express';
import dayjs from 'dayjs';
import { TrainerQueryResponse } from './dto/trainer-query-response';

@Controller('trainers')
export class TrainersController {
  constructor(
    private readonly trainersService: TrainersService,
    private readonly authService: AuthService,
  ) {}

  /** Allows to retrieve list of trainers, especially in the context of trainings. */
  @Get()
  async getTrainersWithTrainings(
    @Req() request: Request,
    @Query() query: TrainerQueryRequest,
  ): Promise<TrainerQueryResponse> {
    this.authService.requireGroup(request, [Group.ADMINS]);

    const firstDay = dayjs(query.start);
    const lastDay = dayjs(query.end);

    const result = await this.trainersService.getTrainersWithTrainings(
      firstDay,
      lastDay,
    );
    return { value: result };
  }
}
