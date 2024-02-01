import { INestApplication } from '@nestjs/common';
import {
  createApp,
  createTraining,
  createTrainer,
  setTrainingStatus,
  startPostgres,
  jwtLikeString,
} from './helpers';

import request from 'supertest';
import dayjs from 'dayjs';
import { CompensationQueryResponse } from '../src/compensations/compensation-response.dto';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('Compensation (e2e)', () => {
  let app: INestApplication;
  let container: StartedPostgreSqlContainer;
  const env = process.env;

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

  test('Returns date range', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'any-trainer');
    const trainingId = (
      await createTraining(app, trainerId, {
        compensationCents: 100,
        date: dayjs('2024-02-10'),
      })
    ).id;
    await setTrainingStatus(app, trainingId, 'APPROVED');

    // WHEN
    await request(app.getHttpServer())
      .get(`/compensations`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['admins'])}`)
      // THEN
      .expect(200)
      .then((result) => {
        expect(result.body.value[0].periodStart).toBe('2024-02-10');
        expect(result.body.value[0].periodEnd).toBe('2024-02-10');
      });
  });

  test('Sums up only APPROVEd trainings', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'any-trainer');
    await createTraining(app, trainerId, {
      compensationCents: 100,
      date: dayjs('2024-01-31'),
    });
    const trainingId02 = (
      await createTraining(app, trainerId, {
        compensationCents: 200,
        date: dayjs('2024-02-01'),
      })
    ).id;
    const trainingId03 = (
      await createTraining(app, trainerId, {
        compensationCents: 300,
        date: dayjs('2024-02-15'),
      })
    ).id;
    const trainingId04 = (
      await createTraining(app, trainerId, {
        compensationCents: 400,
        date: dayjs('2024-02-29'),
      })
    ).id;
    await createTraining(app, trainerId, {
      compensationCents: 500,
      date: dayjs('2024-03-01'),
    });

    await setTrainingStatus(app, trainingId02, 'APPROVED');
    await setTrainingStatus(app, trainingId03, 'APPROVED');
    await setTrainingStatus(app, trainingId03, 'COMPENSATED');
    await setTrainingStatus(app, trainingId04, 'APPROVED');

    // WHEN
    await request(app.getHttpServer())
      .get('/compensations?start=2024-02-01&end=2024-02-29')
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['admins'])}`)
      // THEN
      .expect(200)
      .then((result) => {
        const response: CompensationQueryResponse = result.body;
        const compensationForTrainer = response.value.find(
          (r) => r.user.id === trainerId,
        );
        expect(compensationForTrainer).not.toBeUndefined();
        expect(compensationForTrainer.totalCompensationCents).toBe(600);
        expect(compensationForTrainer.totalTrainings).toBe(2);
      });
  });

  test('contains correspondingIds', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'any-trainer');

    const trainingId01 = (
      await createTraining(app, trainerId, {
        compensationCents: 200,
        date: dayjs('2024-02-01'),
      })
    ).id;
    const trainingId02 = (
      await createTraining(app, trainerId, {
        compensationCents: 200,
        date: dayjs('2024-02-01'),
      })
    ).id;

    await setTrainingStatus(app, trainingId01, 'APPROVED');
    await setTrainingStatus(app, trainingId02, 'APPROVED');

    // WHEN
    await request(app.getHttpServer())
      .get('/compensations?start=2024-02-01&end=2024-02-29')
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, ['admins'])}`)
      // THEN
      .expect(200)
      .then((result) => {
        const response: CompensationQueryResponse = result.body;
        const compensationForTrainer = response.value.find(
          (r) => r.user.id === trainerId,
        );
        expect(compensationForTrainer).not.toBeUndefined();
        expect(compensationForTrainer.correspondingIds).toContain(trainingId01);
        expect(compensationForTrainer.correspondingIds).toContain(trainingId02);
      });
  });
});
