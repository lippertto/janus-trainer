import { INestApplication } from '@nestjs/common';
import {
  createApp,
  createTrainer,
  createTraining,
  startPostgres,
} from './helpers';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { jwtLikeString } from './helpers';

jest.setTimeout(5 * 60 * 1000);

describe('System (e2e)', () => {
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

  test('trainings are cleared', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'any-trainer');
    const training = await createTraining(app, trainerId);

    // WHEN
    const clearResponse = await request(app.getHttpServer())
      .get(`/system/clear-database`)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['admins'])}`);
    expect(clearResponse.statusCode).toBe(200);

    // THEN
    const getTrainingResponse = await request(app.getHttpServer())
      .get(`/trainings/${training.id}`)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['trainers'])}`);

    expect(getTrainingResponse.statusCode).toBe(404);
  });
});
