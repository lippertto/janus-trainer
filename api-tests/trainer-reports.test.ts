import {
  COURSE_1_ID,
  COURSE_1_NAME,
  COURSE_2_ID,
  COURSE_2_NAME,
  LocalApi,
  SERVER,
  USER_ID_TRAINER,
  USER_NAME_TRAINER,
} from './apiTestUtils';
import superagent from 'superagent';
import { TrainerReportDto } from '@/lib/dto';
import { TrainingStatus } from '@/generated/prisma/client';
import { describe, expect, test } from 'vitest';

const api = new LocalApi();

describe('/trainer-reports', () => {
  test('no trainings in period', async () => {
    await api.clearTrainings();

    await api.createTraining({ date: '2024-01-01', userId: USER_ID_TRAINER });

    const response = await superagent.get(
      `${SERVER}/api/trainer-reports?trainerId=${USER_ID_TRAINER}&start=2020-01-01&end=2020-12-31`,
    );
    expect(response.status).toBe(200);
    const report = response.body as TrainerReportDto;
    expect(report.periodStart).toBe('2020-01-01');
    expect(report.periodEnd).toBe('2020-12-31');
    expect(report.trainerName).toBe(USER_NAME_TRAINER);
    expect(report.courses).toHaveLength(0);
  });

  test('one trainings in period', async () => {
    await api.clearTrainings();

    await api
      .createTraining({
        date: '2024-03-04',
        userId: USER_ID_TRAINER,
        compensationCents: 9000,
      })
      .then((c) => api.transitionTraining(c.id, TrainingStatus.APPROVED))
      .then((c) => api.transitionTraining(c.id, TrainingStatus.COMPENSATED));
    const response = await superagent.get(
      `${SERVER}/api/trainer-reports?trainerId=${USER_ID_TRAINER}&start=2024-01-01&end=2024-12-31`,
    );
    expect(response.status).toBe(200);
    const report = response.body as TrainerReportDto;

    expect(report.courses).toHaveLength(1);
    const course = report.courses[0];
    expect(course.courseName).toBe(COURSE_1_NAME);
    expect(course.trainings).toHaveLength(1);
    expect(course.trainings[0].date).toBe('2024-03-04');
    expect(course.trainings[0].compensationCents).toBe(9000);
  });

  test('trainings in multiple courses', async () => {
    await api.clearTrainings();

    await api
      .createTraining({
        date: '2024-03-04',
        userId: USER_ID_TRAINER,
        compensationCents: 9000,
        courseId: COURSE_1_ID,
      })
      .then((c) => api.transitionTraining(c.id, TrainingStatus.APPROVED))
      .then((c) => api.transitionTraining(c.id, TrainingStatus.COMPENSATED));
    await api
      .createTraining({
        date: '2024-04-05',
        userId: USER_ID_TRAINER,
        compensationCents: 7000,
        courseId: COURSE_1_ID,
      })
      .then((c) => api.transitionTraining(c.id, TrainingStatus.APPROVED))
      .then((c) => api.transitionTraining(c.id, TrainingStatus.COMPENSATED));

    await api
      .createTraining({
        date: '2024-05-06',
        userId: USER_ID_TRAINER,
        compensationCents: 8000,
        courseId: COURSE_2_ID,
      })
      .then((c) => api.transitionTraining(c.id, TrainingStatus.APPROVED))
      .then((c) => api.transitionTraining(c.id, TrainingStatus.COMPENSATED));
    const response = await superagent.get(
      `${SERVER}/api/trainer-reports?trainerId=${USER_ID_TRAINER}&start=2024-01-01&end=2024-12-31`,
    );
    expect(response.status).toBe(200);
    const report = response.body as TrainerReportDto;

    expect(report.courses).toHaveLength(2);

    const course1 = report.courses[0];
    expect(course1.courseName).toBe(COURSE_1_NAME);
    expect(course1.trainings).toHaveLength(2);
    expect(course1.trainings[0].date).toBe('2024-03-04');
    expect(course1.trainings[0].compensationCents).toBe(9000);
    expect(course1.trainings[1].date).toBe('2024-04-05');
    expect(course1.trainings[1].compensationCents).toBe(7000);

    const course2 = report.courses[1];
    expect(course2.courseName).toBe(COURSE_2_NAME);
    expect(course2.trainings).toHaveLength(1);
    expect(course2.trainings[0].date).toBe('2024-05-06');
    expect(course2.trainings[0].compensationCents).toBe(8000);
  });
});
