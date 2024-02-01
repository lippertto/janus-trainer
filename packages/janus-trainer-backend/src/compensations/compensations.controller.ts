import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { CompensationsService } from './compensations.service';
import { CompensationQueryResponse } from './compensation-response.dto';
import { AuthService } from '../auth/auth.service';
import { Group } from '../users/user.entity';

@Controller('compensations')
export class CompensationController {
  constructor(
    private readonly compensationService: CompensationsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getCompensations(
    @Req() request: Request,
  ): Promise<CompensationQueryResponse> {
    this.authService.requireGroup(request, [Group.ADMINS]);
    const trainingSummaries =
      await this.compensationService.summarizeTraining();
    return {
      value: trainingSummaries.map((ts) => ({
        correspondingIds: ts.correspondingIds,
        totalCompensationCents: ts.totalCompensationCents,
        totalTrainings: ts.totalTrainings,
        user: {
          id: ts.userId,
          name: ts.userName,
          iban: ts.userIban,
        },
        periodStart: ts.periodStart,
        periodEnd: ts.periodEnd,
      })),
    };
  }
}
