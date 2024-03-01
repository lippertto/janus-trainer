import { Controller, Get, Req, Inject } from '@nestjs/common';
import { Request } from 'express';
import { CompensationsService } from './compensations.service';
import { CompensationQueryResponse } from './compensation-response.dto';
import { AuthService } from '../auth/auth.service';
import { Group } from 'janus-trainer-dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Controller('compensations')
export class CompensationController {
  constructor(
    private readonly compensationService: CompensationsService,
    private readonly authService: AuthService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get()
  async getCompensations(
    @Req() request: Request,
  ): Promise<CompensationQueryResponse> {
    this.authService.requireGroup(request, [Group.ADMINS]);
    this.logger.info(`Getting compensations`);
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
