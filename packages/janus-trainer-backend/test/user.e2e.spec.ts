import { INestApplication } from '@nestjs/common';
import { createApp, startPostgres } from './helpers';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { jwtLikeString } from './helpers';

jest.setTimeout(5 * 60 * 1000);

const validCreateRequest = {
  email: 'tobias.lippert@fastmail.com',
  name: 'Any Name',
  groups: ['trainers', 'admins'],
  iban: 'DE50500105171779934551',
};

describe('User (e2e)', () => {
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

  test('user cannot be created by trainer', async () => {
    await request(app.getHttpServer())
      .post(`/users`)
      .send(validCreateRequest)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['trainers'])}`)
      .expect(403);
  });

  test('User can be created by admin', async () => {
    await request(app.getHttpServer())
      .post(`/users`)
      .send(validCreateRequest)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['admins'])}`)
      // .expect(201)
      .then((result) => {
        expect(result.body.id).not.toBe(undefined);
      });
  });

  test('User with trainer role can be created with iban', async () => {
    const iban = 'NL26INGB2238591354';
    const createRequest = { ...validCreateRequest, iban: iban };

    const response = await request(app.getHttpServer())
      .post(`/users`)
      .send(createRequest)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['admins'])}`)
      .expect(201);

    await request(app.getHttpServer())
      .get(`/users/${response.body.id}`)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['admins'])}`)
      .expect(200)
      .then((result) => {
        expect(result.body.iban).toBe(iban);
      });
  });

  test('User with trainer role cannot be created when iban is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iban, ...createRequestWithoutIban } = {
      ...validCreateRequest,
      groups: ['trainers'],
    };

    await request(app.getHttpServer())
      .post(`/users`)
      .send(createRequestWithoutIban)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['admins'])}`)
      .expect(400);
  });

  test('Log in is possible after user has been created', async () => {
    let userId: string;

    // GIVEN
    await request(app.getHttpServer())
      .post(`/users`)
      .send(validCreateRequest)
      .set('Authorization', `Bearer ${jwtLikeString('someId', ['admins'])}`)
      // .expect(201)
      .then((result) => {
        expect(result.body.id).not.toBe(undefined);
        userId = result.body.id;
      });

    // WHEN
    await request(app.getHttpServer())
      .post('/auth')
      .set('Authorization', `Bearer ${jwtLikeString(userId, ['trainers'])}`)
      // THEN
      .expect(201);
  });
});
