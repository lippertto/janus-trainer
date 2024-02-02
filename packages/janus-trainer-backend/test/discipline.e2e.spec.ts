import { INestApplication } from '@nestjs/common';
import { createApp, startPostgres, jwtLikeString } from './helpers';

import request from 'supertest';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Group } from '../src/users/user.entity';
import { v4 as uuidv4 } from 'uuid';

describe('Discipline (e2e)', () => {
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

  test('can add a discipline', async () => {
    // GIVEN
    const newName = uuidv4();
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/disciplines')
      .set(
        'Authorization',
        `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
      )
      .send({
        name: newName,
      });
    // THEN
    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe(newName);
    expect(response.body.id).not.toBeUndefined();
  });
});
