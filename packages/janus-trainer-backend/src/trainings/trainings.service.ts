import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Training, TrainingStatus } from './trainings.entity';
import { Repository, Between } from 'typeorm';
import { UsersService } from '../users/users.service';
import dayjs from 'dayjs';

@Injectable()
export class TrainingsService {
  private readonly log: Logger = new Logger();

  constructor(
    @InjectRepository(Training)
    private readonly trainingsRepositorz: Repository<Training>,
    private readonly userService: UsersService,
  ) {}

  async getOneTraining(id: string): Promise<Training | null> {
    const idAsNumber = parseInt(id);
    if (Number.isNaN(idAsNumber)) {
      this.log.warn(`id '${id}' is not a number`);
      return Promise.resolve(null);
    }
    return this.trainingsRepositorz.findOne({
      where: { id: idAsNumber },
      relations: { user: true },
    });
  }

  async getAllTrainings(): Promise<Training[]> {
    return this.trainingsRepositorz.find({ relations: { user: true } });
  }

  async findTrainingsByDate(
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
  ): Promise<Training[]> {
    return await this.trainingsRepositorz.find({
      where: {
        date: Between(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')),
      },
      relations: { user: true },
    });
  }

  async findTrainingsByUserId(userId: string): Promise<Training[]> {
    return await this.trainingsRepositorz.find({
      where: {
        user: { id: userId },
      },
      relations: { user: true },
    });
  }

  async getTrainingsByTrainerId(trainerId: string): Promise<Training[]> {
    return await this.trainingsRepositorz.find({
      where: { user: { id: trainerId } },
      relations: { user: true },
    });
  }

  async addTraining({
    participantCount,
    compensationCents,
    date,
    discipline,
    group,
    userId,
  }: {
    participantCount: number;
    compensationCents: number;
    date: string;
    discipline: string;
    group: string;
    userId: string;
  }): Promise<Training> {
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new BadRequestException(`User with id ${userId} not found`);
    }

    const newTraining = await this.trainingsRepositorz.create({
      participantCount: participantCount,
      compensationCents: compensationCents,
      date: date,
      discipline: discipline,
      group: group,
      user: user,
      status: TrainingStatus.NEW,
    });
    return await this.trainingsRepositorz.save(newTraining);
  }

  async deleteTraining(id: string): Promise<void> {
    const idAsNumber = parseInt(id);
    if (Number.isNaN(idAsNumber)) {
      this.log.warn("training id '{}' is not a number");
      return;
    }
    await this.trainingsRepositorz.delete(idAsNumber);
  }

  /** Transition a training to a new status.
   * @throws BadRequestException If an error ocurrs
   */
  async transitionTrainingStatus(
    trainingOrId: Training | string,
    newStatus: TrainingStatus,
  ): Promise<Training> {
    const training = await this.trainingOrIdToTraining(trainingOrId);

    if (training.status === TrainingStatus.COMPENSATED) {
      throw new BadRequestException(
        'Cannot transition a training from COMPENSATED',
      );
    }
    if (
      training.status === TrainingStatus.NEW &&
      newStatus === TrainingStatus.COMPENSATED
    ) {
      throw new BadRequestException(
        'Cannot transition a training from NEW to COMPENSATED',
      );
    }
    training.status = newStatus;
    await this.trainingsRepositorz.save(training);
    return this.getOneTraining(training.id.toString());
  }

  async updateTraining(
    trainingOrId: Training | string,
    compensationCents: number,
    date: string,
    discipline: string,
    group: string,
    participantCount: number,
  ): Promise<Training> {
    const training = await this.trainingOrIdToTraining(trainingOrId);
    training.compensationCents = compensationCents;
    training.date = date;
    training.discipline = discipline;
    training.group = group;
    training.participantCount = participantCount;

    return this.trainingsRepositorz.save(training);
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
