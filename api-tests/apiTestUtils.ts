import {
  CostCenterCreateRequest,
  CostCenterDto,
  CourseDto,
  PaymentDto,
  TrainingCreateRequest,
  TrainingDto,
} from '@/lib/dto';
import superagent from 'superagent';
import { DayOfWeek, TrainingStatus } from '@prisma/client';

export const USER_ID_ADMIN = '502c79bc-e051-70f5-048c-5619e49e2383';
export const USER_ID_TRAINER = '80ac598c-e0b1-7040-5e0e-6fd257a53699';

export const USER_NAME_ADMIN = 'Test-User Admin';
export const USER_NAME_TRAINER = 'Test-User Trainer';

export const COURSE_1_ID = 1;
export const COURSE_2_ID = 2;
export const COURSE_1_NAME = 'Test-Kurs 1';
export const COURSE_2_NAME = 'Test-Kurs 2';

export class LocalApi {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async createTraining({
    date = '2020-01-01',
    courseId = 1,
    compensationCents = 100,
    userId = USER_ID_ADMIN,
  }: {
    date?: string;
    courseId?: number;
    compensationCents?: number;
    userId?: string;
  }): Promise<TrainingDto> {
    const request: TrainingCreateRequest = {
      date,
      courseId,
      compensationCents,
      userId,
      participantCount: 10,
      comment: '',
    };
    const result = await superagent
      .post(`${this.baseUrl}/api/trainings`)
      .send(request);
    return result.body as TrainingDto;
  }

  async deleteTraining(id: number) {
    await superagent.delete(`${this.baseUrl}/api/trainings/${id}`);
  }

  async transitionTraining(id: number, status: TrainingStatus) {
    const response = await superagent
      .patch(`${this.baseUrl}/api/trainings/${id}`)
      .send({ status });
    return response.body as TrainingDto;
  }

  async clearTrainings() {
    await superagent.delete(`${this.baseUrl}/api/trainings`);
  }

  async createPayment({
    userId = USER_ID_ADMIN,
    trainingIds,
  }: {
    userId?: string;
    trainingIds: number[];
  }): Promise<PaymentDto> {
    const result = await superagent.post(`${this.baseUrl}/api/payments`).send({
      userId,
      trainingIds: trainingIds,
    });
    return result.body as PaymentDto;
  }

  async getPaymentsForTrainer({
    trainerId,
  }: {
    trainerId: string;
  }): Promise<PaymentDto[]> {
    const result = await superagent.get(
      `${this.baseUrl}/api/payments?trainerId=${trainerId}`,
    );
    return result.body.value as PaymentDto[];
  }

  async createCostCenter(): Promise<CostCenterDto> {
    const createRequest: CostCenterCreateRequest = {
      name: 'Name',
      costCenterId: 666,
    };

    const createResponse = await superagent
      .post(`${this.baseUrl}/api/cost-centers`)
      .send(createRequest);
    return createResponse.body as CostCenterDto;
  }

  async createCourse({
    costCenterId,
  }: {
    costCenterId: number;
  }): Promise<CourseDto> {
    const result = await superagent.post(`${this.baseUrl}/api/courses`).send({
      name: 'any-course',
      durationMinutes: 120,
      weekday: DayOfWeek.TUESDAY,
      startHour: 10,
      startMinute: 0,
      trainerIds: [],
      disciplineId: costCenterId,
    });
    return result.body as CourseDto;
  }
}
