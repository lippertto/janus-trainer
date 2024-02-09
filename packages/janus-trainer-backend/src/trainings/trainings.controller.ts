import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import { BatchApproveTrainingsRequest } from './dto/batch-approve-trainings-request';
import { TrainingsBatchApproveResponse } from './dto/trainings-batch-approve-response';
import { TrainingUpdateStatusRequest } from './dto/training-update-status-request';
import { TrainingsQueryResponse } from './dto/trainings-query-response';
import { TrainingResponse } from './dto/training-response';
import { TrainingCreateRequestDto } from 'janus-trainer-dto';
import { Training, TrainingStatus } from './training.entity';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { Group } from 'janus-trainer-dto';
import { TrainingUpdateRequestDto } from 'janus-trainer-dto';
import { SharedService } from '../shared/shared.service';

function trainingToResponse(training: Training): TrainingResponse {
  return {
    id: training.id.toString(),
    date: training.date,
    discipline: {
      name: training.discipline.name,
      id: training.discipline.id.toString(),
    },
    group: training.group,
    compensationCents: training.compensationCents,
    user: {
      id: training.user.id.toString(),
      name: training.user.name,
    },
    participantCount: training.participantCount,
    status: training.status,
    userId: training.user.id.toString(),
    userName: training.user.name,
  };
}

@Controller('trainings')
export class TrainingsController {
  constructor(
    private readonly trainingsService: TrainingsService,
    private readonly authService: AuthService,
    private readonly sharedService: SharedService,
  ) {}

  @Get()
  @Header('Content-Type', 'application/json')
  async find(
    @Query('start') startString: string,
    @Query('end') endString: string,
    @Query('userId') userId: string,
  ): Promise<TrainingsQueryResponse> {
    let trainings: Training[];
    if (userId) {
      trainings = await this.trainingsService.findTrainingsByUserId(userId);
    } else {
      trainings = await this.trainingsService.findTrainingsByDate(
        this.sharedService.dateStringToDate(startString),
        this.sharedService.dateStringToDate(endString),
      );
    }
    return { value: trainings.map((gt) => trainingToResponse(gt)) };
  }

  @Put(':id')
  async updateTraining(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateRequest: TrainingUpdateRequestDto,
  ): Promise<TrainingResponse> {
    const { userId, groups } = this.authService.parseRequest(request);

    const trainingToUpdate = await this.trainingsService.getOneTraining(id);
    if (trainingToUpdate === null) {
      throw new NotFoundException(`Could not find training ${id} for update.`);
    }

    if (groups.indexOf(Group.ADMINS) === -1) {
      if (userId !== trainingToUpdate.user.id) {
        throw new UnauthorizedException(
          `Only admins are allowed to update trainings of other people`,
        );
      }
    }

    const result = await this.trainingsService.updateTraining(
      id,
      updateRequest.compensationCents,
      updateRequest.date,
      updateRequest.disciplineId,
      updateRequest.group,
      updateRequest.participantCount,
    );

    return trainingToResponse(result);
  }

  @Patch()
  async batchPatch(
    @Body() request: BatchApproveTrainingsRequest,
  ): Promise<TrainingsBatchApproveResponse> {
    const result = await request.operations.map(async (op) => {
      try {
        const id = op.id;
        switch (op.operation) {
          case 'SET_COMPENSATED':
            await this.trainingsService.transitionTrainingStatus(
              id,
              TrainingStatus.COMPENSATED,
            );
            return 'OK';
          default:
            return {
              error: {
                code: 'InvalidBatchOperation',
                message: 'Unknown operation encountered',
              },
            };
        }
      } catch (err) {
        if (!(err instanceof BadRequestException)) {
          throw err;
        }
        return {
          error: { code: 'SetCompensatedStatusFailed', message: err.message },
        };
      }
    });

    return { value: await Promise.all(result) };
  }

  @Post()
  @Header('Content-Type', 'application/json')
  async createTraining(
    @Body() createRequest: TrainingCreateRequestDto,
    @Req() request: Request,
  ): Promise<TrainingResponse> {
    const { userId, groups } = this.authService.parseRequest(request);

    if (groups.indexOf(Group.ADMINS) === -1) {
      if (userId != createRequest.userId) {
        throw new ForbiddenException(
          'Only admins may create trainings for others.',
        );
      }
    }

    const newTraining = await this.trainingsService.addTraining({
      ...createRequest,
    });
    return trainingToResponse(newTraining);
  }

  @Patch(':id')
  async updateOneTraining(
    @Req() httpRequest: Request,
    @Param('id') id: string,
    @Body() updateRequest: TrainingUpdateStatusRequest,
  ): Promise<TrainingResponse> {
    this.authService.requireGroup(httpRequest, [Group.ADMINS, Group.TRAINERS]);
    const currentTraining = await this.trainingsService.getOneTraining(id);
    if (currentTraining === null) {
      throw new NotFoundException('Could not find trining');
    }
    return trainingToResponse(
      await this.trainingsService.transitionTrainingStatus(
        currentTraining,
        updateRequest.status,
      ),
    );
  }

  @Get(':id')
  async getOneTraining(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<TrainingResponse> {
    this.authService.requireGroup(request, [Group.ADMINS, Group.TRAINERS]);
    const result = await this.trainingsService.getOneTraining(id);
    if (result == null) {
      throw new NotFoundException('Could not find the queried training by id');
    }
    return trainingToResponse(result);
  }

  @Delete(':id')
  @Header('Content-Type', 'application/json')
  async deleteTraining(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<string> {
    const { userId, groups } = this.authService.parseRequest(request);

    const training = await this.trainingsService.getOneTraining(id);
    if (training === null) {
      throw new HttpException('OK', HttpStatus.NO_CONTENT);
    }

    if (groups.indexOf(Group.ADMINS) === -1) {
      if (userId !== training.user.id) {
        throw new UnauthorizedException(
          `Only admins are allowed to delete trainings of other people`,
        );
      }
    }

    if (training.status === TrainingStatus.COMPENSATED) {
      throw new BadRequestException(
        `Cannot delete trainings with status ${training.status}`,
      );
    }

    await this.trainingsService.deleteTraining(id);
    throw new HttpException('OK', HttpStatus.NO_CONTENT);
  }
}
