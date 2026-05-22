import {
  CostCenterCreateRequest,
  CostCenterDto,
  CourseDto,
  PaymentDto,
  TrainingCreateRequest,
  TrainingDto,
} from '@/lib/dto';
import superagent from 'superagent';
import { DayOfWeek, TrainingStatus } from '@/generated/prisma/enums';
import { generateAdminToken } from './test-auth';

export const SERVER = 'http://localhost:3000';

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
  private authToken: string | null = null;

  constructor(baseUrl: string = SERVER) {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize authentication for this API client.
   * Must be called before making any authenticated requests.
   */
  async authenticate(token?: string) {
    this.authToken = token || (await generateAdminToken());
  }

  /**
   * Add authentication header to a superagent request
   */
  private addAuth(request: superagent.SuperAgentRequest) {
    if (this.authToken) {
      // NextAuth reads the JWT from a cookie named based on NEXTAUTH_URL
      // For testing, we can set it directly
      request.set('Cookie', `next-auth.session-token=${this.authToken}`);
    }
    return request;
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
    const result = await this.addAuth(
      superagent.post(`${this.baseUrl}/api/trainings`),
    ).send(request);
    return result.body as TrainingDto;
  }

  async deleteTraining(id: number) {
    await this.addAuth(
      superagent.delete(`${this.baseUrl}/api/trainings/${id}`),
    );
  }

  async transitionTraining(id: number, status: TrainingStatus) {
    const response = await this.addAuth(
      superagent.patch(`${this.baseUrl}/api/trainings/${id}`),
    ).send({ status });
    return response.body as TrainingDto;
  }

  async clearTrainings() {
    await this.addAuth(superagent.delete(`${this.baseUrl}/api/trainings`));
  }

  async createPayment({
    userId = USER_ID_ADMIN,
    trainingIds,
  }: {
    userId?: string;
    trainingIds: number[];
  }): Promise<PaymentDto> {
    const result = await this.addAuth(
      superagent.post(`${this.baseUrl}/api/payments`),
    ).send({
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
    const result = await this.addAuth(
      superagent.get(`${this.baseUrl}/api/payments?trainerId=${trainerId}`),
    );
    return result.body.value as PaymentDto[];
  }

  async deleteCourse(id: number): Promise<void> {
    await this.addAuth(superagent.delete(`${this.baseUrl}/api/courses/${id}`));
  }

  async createCostCenter(): Promise<CostCenterDto> {
    const costCenterId = 666;
    const costCenterResponse = await this.addAuth(
      superagent.get(
        `${this.baseUrl}/api/cost-centers?costCenterId=${costCenterId}`,
      ),
    );
    const existing = costCenterResponse.body.value as CostCenterDto[];
    if (existing.length > 0) {
      const courses = await this.addAuth(
        superagent.get(
          `${this.baseUrl}/api/courses?costCenterId=${existing[0].id}`,
        ),
      );
      const linkedCourses = courses.body.value as CourseDto[];
      await Promise.all(
        linkedCourses.map((course) => this.deleteCourse(course.id)),
      );

      // api logic ensures that only one cost-center with the number exists
      await this.addAuth(
        superagent.delete(`${this.baseUrl}/api/cost-centers/${existing[0].id}`),
      );
    }

    const createRequest: CostCenterCreateRequest = {
      name: 'Name',
      costCenterId,
    };

    const createResponse = await this.addAuth(
      superagent.post(`${this.baseUrl}/api/cost-centers`),
    ).send(createRequest);
    return createResponse.body as CostCenterDto;
  }

  async createCourse({
    costCenterId,
  }: {
    costCenterId: number;
  }): Promise<CourseDto> {
    const result = await this.addAuth(
      superagent.post(`${this.baseUrl}/api/courses`),
    ).send({
      name: 'any-course',
      durationMinutes: 120,
      weekday: DayOfWeek.TUESDAY,
      startHour: 10,
      startMinute: 0,
      trainerIds: [],
      costCenterId,
    });
    return result.body as CourseDto;
  }
}
