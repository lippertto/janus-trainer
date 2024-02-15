import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Training } from './training.entity';
import { Repository, Between } from 'typeorm';
import { UsersService } from '../users/users.service';
import dayjs from 'dayjs';
import { DisciplineService } from '../disciplines/discliplines.service';
import { TrainingStatusDto } from 'janus-trainer-dto';

/** The relations that the orm should retrieve */
const RELATIONS_TO_RETRIEVE = { user: true, discipline: true };

@Injectable()
export class TrainingsService {
  private readonly log: Logger = new Logger();

  constructor(
    @InjectRepository(Training)
    private readonly trainingsRepository: Repository<Training>,
    private readonly userService: UsersService,
    private readonly disciplineService: DisciplineService,
  ) {}

  async getOneTraining(id: string): Promise<Training | null> {
    const idAsNumber = parseInt(id);
    if (Number.isNaN(idAsNumber)) {
      this.log.warn(`id '${id}' is not a number`);
      return Promise.resolve(null);
    }
    return this.trainingsRepository.findOne({
      where: { id: idAsNumber },
      relations: RELATIONS_TO_RETRIEVE,
    });
  }

  async getAllTrainings(): Promise<Training[]> {
    return this.trainingsRepository.find({ relations: RELATIONS_TO_RETRIEVE });
  }

  async findTrainingsByDate(
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
  ): Promise<Training[]> {
    return await this.trainingsRepository.find({
      where: {
        date: Between(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
      },
      relations: RELATIONS_TO_RETRIEVE,
    });
  }

  async findTrainingsByUserId(userId: string): Promise<Training[]> {
    return await this.trainingsRepository.find({
      where: {
        user: { id: userId },
      },
      relations: RELATIONS_TO_RETRIEVE,
    });
  }

  async getTrainingsByTrainerId(trainerId: string): Promise<Training[]> {
    return await this.trainingsRepository.find({
      where: { user: { id: trainerId } },
      relations: RELATIONS_TO_RETRIEVE,
    });
  }

  async addTraining({
    participantCount,
    compensationCents,
    date,
    disciplineId,
    group,
    userId,
  }: {
    participantCount: number;
    compensationCents: number;
    date: string;
    disciplineId: string;
    group: string;
    userId: string;
  }): Promise<Training> {
    const discipline =
      await this.disciplineService.getDisciplineById(disciplineId);
    if (!discipline)
      throw new BadRequestException(
        `Could not find discipline ${disciplineId}`,
      );

    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new BadRequestException(`User with id ${userId} not found`);
    }

    const newTraining = await this.trainingsRepository.create({
      participantCount: participantCount,
      compensationCents: compensationCents,
      date: date,
      discipline: discipline,
      group: group,
      user: user,
      status: TrainingStatusDto.NEW,
    });
    const createdTraining = await this.trainingsRepository.save(newTraining);
    return createdTraining;
  }

  async deleteTraining(id: string): Promise<void> {
    const idAsNumber = parseInt(id);
    if (Number.isNaN(idAsNumber)) {
      this.log.warn("training id '{}' is not a number");
      return;
    }
    await this.trainingsRepository.delete(idAsNumber);
  }

  /** Transition a training to a new status.
   * @throws BadRequestException If an error ocurrs
   */
  async transitionTrainingStatus(
    trainingOrId: Training | string,
    newStatus: TrainingStatusDto,
  ): Promise<Training> {
    const training = await this.trainingOrIdToTraining(trainingOrId);

    if (training.status === TrainingStatusDto.COMPENSATED) {
      throw new BadRequestException(
        'Cannot transition a training from COMPENSATED',
      );
    }
    if (
      training.status === TrainingStatusDto.NEW &&
      newStatus === TrainingStatusDto.COMPENSATED
    ) {
      throw new BadRequestException(
        'Cannot transition a training from NEW to COMPENSATED',
      );
    }
    training.status = newStatus;
    return await this.trainingsRepository.save(training);
    // return this.getOneTraining(training.id.toString());
  }

  async updateTraining(
    trainingOrId: Training | string,
    compensationCents: number,
    date: string,
    disciplineId: string,
    group: string,
    participantCount: number,
  ): Promise<Training> {
    const discipline =
      await this.disciplineService.getDisciplineById(disciplineId);
    if (!discipline)
      throw new BadRequestException(
        `Could not find discipline ${disciplineId}`,
      );

    const training = await this.trainingOrIdToTraining(trainingOrId);
    training.compensationCents = compensationCents;
    training.date = date;
    training.discipline = discipline;
    training.group = group;
    training.participantCount = participantCount;

    return this.trainingsRepository.save(training);
  }

  async trainingOrIdToTraining(
    trainingOrId: Training | string,
  ): Promise<Training | null> {
    if (typeof trainingOrId === 'string') {
      const result = await this.getOneTraining(trainingOrId);
      if (result === null) {
        throw new BadRequestException('Invalid id provided');
      }
      return result;
    } else {
      return trainingOrId as Training;
    }
  }
}
