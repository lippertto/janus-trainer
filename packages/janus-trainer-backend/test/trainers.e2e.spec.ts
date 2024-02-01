import { INestApplication } from '@nestjs/common';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  createApp,
  createTraining,
  createTrainer,
  jwtLikeString,
  setTrainingStatus,
  startPostgres,
} from './helpers';
import request from 'supertest';
import dayjs from 'dayjs';
import type { TrainerQueryResponse } from '../src/trainers/dto/trainer-query-response';

jest.setTimeout(2 * 60 * 1000);

describe('Trainers (e2e)', () => {
  let app: INestApplication;
  const env = process.env;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await startPostgres(env);
  });

  beforeEach(async () => {
    jest.resetModules();
    app = await createApp();
  });

  afterEach(() => {});

  afterAll(async () => {
    await container.stop();
    process.env = env;
  });

  test('Cannot request things without admin role', async () => {
    const trainerId = await createTrainer(app, 'trainer-1');

    await request(app.getHttpServer())
      .get(`/trainers?start=2021-01-01&end=2021-12-31`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['trainers'])}`)
      .expect(403);
  });

  test('Can request trainers with admin role', async () => {
    // GIVEN
    const trainerName = 'trainer-1';
    const trainerId = await createTrainer(app, trainerName);

    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2021-04-04'),
    });
    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2021-04-04'),
    });

    // WHEN
    await request(app.getHttpServer())
      .get(`/trainers?start=2021-01-01&end=2021-12-31`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['admins'])}`)
      // THEN
      .expect(200)
      .then((result) => {
        const response = result.body as TrainerQueryResponse;
        expect(response.value).toHaveLength(1);
        expect(response.value[0].userId).toBe(trainerId);
        expect(response.value[0].userName).toBe(trainerName);
        expect(response.value[0].newCount).toBe(2);
      });
  });

  test('filters dates', async () => {
    // GIVEN
    const trainerName = 'trainer-1';
    const trainerId = await createTrainer(app, trainerName);

    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2020-04-04'),
    });
    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2021-04-04'),
    });
    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2022-04-04'),
    });

    // WHEN
    await request(app.getHttpServer())
      .get(`/trainers?start=2021-01-01&end=2021-12-31`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['admins'])}`)
      // THEN
      .expect(200)
      .then((result) => {
        const response = result.body as TrainerQueryResponse;
        const thisTrainingObject = response.value.find(
          (v) => v.userId === trainerId,
        );
        expect(thisTrainingObject).not.toBeUndefined();
        const trainingCount = thisTrainingObject.newCount;
        expect(trainingCount).toBe(1);
      });
  });

  test('filters statuses', async () => {
    // GIVEN
    const trainerName = 'trainer-1';
    const trainerId = await createTrainer(app, trainerName);

    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2021-04-04'),
    });
    const trainingId02 = (
      await createTraining(app, trainerId, {
        compensationCents: 100,
        date: dayjs('2021-04-04'),
      })
    ).id;
    await setTrainingStatus(app, trainingId02, 'APPROVED');
    const trainingId03 = (
      await createTraining(app, trainerId, {
        compensationCents: 100,
        date: dayjs('2021-04-04'),
      })
    ).id;
    await setTrainingStatus(app, trainingId03, 'APPROVED');
    const trainingId04 = (
      await createTraining(app, trainerId, {
        compensationCents: 100,
        date: dayjs('2021-04-04'),
      })
    ).id;
    await setTrainingStatus(app, trainingId04, 'APPROVED');
    await setTrainingStatus(app, trainingId04, 'COMPENSATED');

    // WHEN
    await request(app.getHttpServer())
      .get(`/trainers?start=2021-01-01&end=2021-12-31`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['admins'])}`)
      // THEN
      .expect(200)
      .then((result) => {
        const response = result.body as TrainerQueryResponse;
        const thisTrainingObject = response.value.find(
          (v) => v.userId === trainerId,
        );
        expect(thisTrainingObject).not.toBeUndefined();
        expect(thisTrainingObject.newCount).toBe(1);
        expect(thisTrainingObject.approvedCount).toBe(2);
        expect(thisTrainingObject.compensatedCount).toBe(1);
      });
  });
});
