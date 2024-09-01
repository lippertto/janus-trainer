import { PaymentDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import superagent from 'superagent';
import { TrainingStatus } from '@prisma/client';

export const USER_ID_ADMIN = '502c79bc-e051-70f5-048c-5619e49e2383';
export const USER_ID_TRAINER = '80ac598c-e0b1-7040-5e0e-6fd257a53699';

export class LocalApi {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async createTraining(
    {
      date = '2020-01-01', courseId = 1, compensationCents = 100,
      userId = USER_ID_ADMIN,
    }: {
      date?: string, courseId?: number,
      compensationCents?: number,
      userId?: string,
    },
  ): Promise<TrainingDto> {
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

  async transitionTraining(id: number, status: TrainingStatus) {
    await superagent
      .patch(`${this.baseUrl}/api/trainings/${id}`)
      .send({ status });
  }

  async clearTrainings() {
    await superagent.delete(`${this.baseUrl}/api/trainings`);
  }

  async createPayment({ userId = USER_ID_ADMIN, trainingIds }: { userId?: string, trainingIds: number[] }): Promise<PaymentDto> {
    const result = await superagent
      .post(`${this.baseUrl}/api/payments`)
      .send({
        userId,
        trainingIds: trainingIds,
      })
    ;
    return result.body as PaymentDto;
  }

  async getPaymentsForTrainer({trainerId}: {trainerId: string}): Promise<PaymentDto[]> {
    const result = await superagent
      .get(`${this.baseUrl}/api/payments?trainerId=${trainerId}`)
    ;
    return result.body.value as PaymentDto[];
  }
}