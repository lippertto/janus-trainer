import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createApp, jwtLikeString, startPostgres } from './helpers';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { v4 as uuidv4 } from 'uuid';
import { Group, HolidayDto } from 'janus-trainer-dto';

async function createHoliday(
  app: INestApplication,
  start: string,
  end: string,
  name: string,
): Promise<HolidayDto> {
  const response = await request(app.getHttpServer())
    .post('/holidays')
    .set(
      'Authorization',
      `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
    )
    .send({
      name,
      start,
      end,
    })
    .expect(201);
  return response.body;
}

describe('Holidays (e2e)', () => {
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

  test('can create holiday', async () => {
    // GIVEN
    const newName = uuidv4();
    // WHEN
    const payload = await createHoliday(
      app,
      '2022-01-01',
      '2022-01-02',
      newName,
    );
    // THEN
    expect(payload.name).toBe(newName);
    expect(payload.id).not.toBeUndefined();
    expect(payload.start).toBe('2022-01-01');
    expect(payload.end).toBe('2022-01-02');

    const getResponse = await request(app.getHttpServer()).get(
      `/holidays/${payload.id}`,
    );
    expect(getResponse.statusCode).toBe(200);
  });

  test('cannot create holiday with endDate < startDate', async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post('/holidays')
      .set(
        'Authorization',
        `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
      )
      .send({
        name: uuidv4(),
        start: '2022-01-02',
        end: '2022-01-01',
      });
    // THEN
    expect(response.statusCode).toBe(400);
  });

  test('can delete holiday', async () => {
    // GIVEN
    const existing = await createHoliday(
      app,
      '2022-01-01',
      '2022-01-02',
      'any-name',
    );

    // WHEN
    await request(app.getHttpServer())
      .delete(`/holidays/${existing.id}`)
      .set(
        'Authorization',
        `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
      )
      .expect(204);
    // THEN
    await request(app.getHttpServer())
      .get(`/holidays/${existing.id}`)
      .set(
        'Authorization',
        `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
      )
      .expect(404);
  });

  test('can query holidays', async () => {
    // GIVEN
    // note all dates in the 11th century because we do not want to conflict with the other tests
    await createHoliday(app, '1021-01-01', '1021-01-02', 'any-name'); // not in 1022
    await createHoliday(app, '1021-12-01', '1022-01-02', 'any-name'); // start not in 1022
    await createHoliday(app, '1022-01-01', '1022-01-02', 'any-name'); // in 1022
    await createHoliday(app, '1022-12-31', '1023-01-02', 'any-name'); // in 1022 (end in 1023)
    await createHoliday(app, '1023-01-01', '1023-01-02', 'any-name'); // not in 1022

    // WHEN
    const singleYearResponse = await request(app.getHttpServer())
      .get(`/holidays?year=1022`)
      .set(
        'Authorization',
        `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
      );

    // THEN
    expect(singleYearResponse.statusCode).toBe(200);
    const holidays = singleYearResponse.body.value;
    expect(holidays).toHaveLength(2);

    // WHEN
    const multiYearResponse = await request(app.getHttpServer())
      .get(`/holidays?year=1022,1023`)
      .set(
        'Authorization',
        `Bearer ${jwtLikeString('any-trainer-id', [Group.ADMINS])}`,
      );

    // THEN
    expect(multiYearResponse.statusCode).toBe(200);
    const multiYearHolidays = multiYearResponse.body.value;
    expect(multiYearHolidays).toHaveLength(3);
  });
});
