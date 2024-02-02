import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  JWT_WITH_ADMIN_GROUP,
  createApp,
  createTrainer,
  jwtLikeString,
  setTrainingStatus,
  startPostgres,
  createTraining,
} from './helpers';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import dayjs from 'dayjs';
import { Training } from '../src/trainings/trainings.entity';
import { TrainingResponse } from '../src/trainings/dto/training-response';
import { v4 as uuidv4 } from 'uuid';

jest.setTimeout(5 * 60 * 1000);

describe('trainings (e2e)', () => {
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

  afterAll(async () => {
    await container.stop();
    process.env = env;
  });

  test('Return 400 for incomplete request', (done) => {
    request(app.getHttpServer())
      .post('/trainings')
      .send({ compensationCents: '100' })
      .expect(400)
      .end((err) => {
        if (err) return done(err);
        return done();
      });
  });

  test('training can be retrieved after storing it', async () => {
    const userId = await createTrainer(app, 'any-trainer-name');
    let trainingId = null;

    await request(app.getHttpServer())
      .post('/trainings')
      .set('Authorization', `Bearer ${JWT_WITH_ADMIN_GROUP}`)
      .send({
        compensationCents: 100,
        date: '2023-01-02',
        discipline: 'discipline',
        group: 'group',
        participantCount: 5,
        userId: userId,
      })
      .expect(201)
      .then((response) => {
        expect(response.body).toMatchObject({
          compensationCents: 100,
          date: '2023-01-02',
          discipline: 'discipline',
          group: 'group',
          participantCount: 5,
        });
        trainingId = response.body.id;
      });

    await request(app.getHttpServer())
      .get(`/trainings/${trainingId}`)
      .expect(200);
  });

  test('returns all trainings for all trainers within timeframe ', async () => {
    // GIVEN
    const trainerId01 = await createTrainer(app, 'trainer-name');
    const trainerId02 = await createTrainer(app, 'trainer-name');

    await createTraining(app, trainerId01, { date: dayjs('2022-05-05') });
    await createTraining(app, trainerId01, { date: dayjs('2022-05-05') });
    await createTraining(app, trainerId02, { date: dayjs('2022-05-05') });
    await createTraining(app, trainerId02, { date: dayjs('2022-05-05') });

    // WHEN
    const response = await request(app.getHttpServer())
      .get(`/trainings?start=2022-05-01&end=2022-06-01`)
      .expect(200);

    // THEN
    expect(response.body.value).toHaveLength(4);
  });

  test('trainings can be deleted', async () => {
    const trainerId = await createTrainer(app, 'trainer-name');

    await createTraining(app, trainerId);
    await createTraining(app, trainerId);
    const trainingId = (await createTraining(app, trainerId)).id;

    // WHEN
    await request(app.getHttpServer())
      .delete(`/trainings/${trainingId}`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId, [])}`)
      .expect(204);

    // THEN
    const response = await request(app.getHttpServer()).get(
      `/trainings?userId=${trainerId}`,
    );
    expect(response.body.value).toHaveLength(2);
  });

  test('Update a training to a new status', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'trainer-name');
    let trainingId = null;

    await createTraining(app, trainerId);
    await createTraining(app, trainerId).then((result) => {
      trainingId = result.id;
      expect(result.status).toBe('NEW');
    });

    // WHEN
    await setTrainingStatus(app, trainingId, 'APPROVED');

    // THEN
    await request(app.getHttpServer())
      .get(`/trainings/${trainingId}`)
      .expect(200)
      .then((response) => {
        expect(response.body.status).toBe('APPROVED');
      });
  });

  test('Cannot set training status from COMPENSATED', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'trainer-name');
    const trainingId = (await createTraining(app, trainerId)).id;

    await setTrainingStatus(app, trainingId, 'APPROVED');
    await setTrainingStatus(app, trainingId, 'COMPENSATED');

    // WHEN
    await request(app.getHttpServer())
      .patch(`/trainings/${trainingId}`)
      .send({ status: 'APPROVED' })
      // THEN
      .expect(400);
  });

  test('Can update multiple trainings', async () => {
    // GIVEN
    const trainerId = await createTrainer(app, 'trainer-name');
    const trainingId01 = (await createTraining(app, trainerId)).id;
    const trainingId02 = (await createTraining(app, trainerId)).id;
    await setTrainingStatus(app, trainingId01, 'APPROVED');
    await setTrainingStatus(app, trainingId02, 'APPROVED');

    // WHEN
    await request(app.getHttpServer())
      .patch('/trainings')
      .send({
        operations: [
          { id: trainingId01, operation: 'SET_COMPENSATED' },
          { id: trainingId02, operation: 'SET_COMPENSATED' },
        ],
      })
      .expect(200)
      .expect({ value: ['OK', 'OK'] });

    // THEN
    await request(app.getHttpServer())
      .get(`/trainings/${trainingId01}`)
      .then((response) => {
        expect(response.body.status).toBe('COMPENSATED');
      });
  });

  test('query dates are inclusive', async () => {
    // GIVEN
    const trainerId01 = await createTrainer(app, 'trainer-name');
    await createTraining(app, trainerId01, { date: dayjs('2022-04-30') });
    await createTraining(app, trainerId01, { date: dayjs('2022-05-01') });
    await createTraining(app, trainerId01, { date: dayjs('2022-05-15') });
    await createTraining(app, trainerId01, { date: dayjs('2022-05-31') });
    await createTraining(app, trainerId01, { date: dayjs('2022-06-01') });

    // WHEN
    const response = await request(app.getHttpServer())
      .get(`/trainings?start=2022-05-01&end=2022-05-31`)
      .expect(200);
    // THEN
    const trainings = response.body.value as Training[];
    expect(trainings.filter((v) => v.user.id === trainerId01)).toHaveLength(3);
  });

  test('can update training', async () => {
    // GIVEN
    const trainerId01 = await createTrainer(app, 'trainer-name');
    const createdTrainingId = (
      await createTraining(app, trainerId01, { date: dayjs('2022-04-30') })
    ).id;
    const discipline = uuidv4();
    const group = uuidv4();
    const participantCount = Math.floor(Math.random() * 1000);
    const compensationCents = Math.floor(Math.random() * 1000);

    // WHEN
    const response = await request(app.getHttpServer())
      .put(`/trainings/${createdTrainingId}`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId01, ['admins'])}`)
      .send({
        date: '2024-01-25',
        discipline: discipline,
        group: group,
        participantCount: participantCount,
        compensationCents: compensationCents,
      })
      .expect(200);

    // THEN
    // check response
    const returnedTraining = response.body as TrainingResponse;
    expect(returnedTraining.date).toBe('2024-01-25');
    expect(returnedTraining.discipline).toBe(discipline);
    expect(returnedTraining.group).toBe(group);
    expect(returnedTraining.participantCount).toBe(participantCount);
    expect(returnedTraining.compensationCents).toBe(compensationCents);

    // get and verify
    const getResponse = await request(app.getHttpServer())
      .get(`/trainings/${createdTrainingId}`)
      .set('Authorization', `Bearer ${jwtLikeString(trainerId01, ['admins'])}`)
      .expect(200);
    const gottenTraining = getResponse.body as TrainingResponse;
    expect(gottenTraining.date).toBe('2024-01-25');
    expect(gottenTraining.discipline).toBe(discipline);
    expect(gottenTraining.group).toBe(group);
    expect(gottenTraining.participantCount).toBe(participantCount);
    expect(gottenTraining.compensationCents).toBe(compensationCents);
  });

  test('accepts trainings for october', async () => {
    const trainerId01 = await createTrainer(app, 'trainer-name');

    await createTraining(app, trainerId01, { date: dayjs('2022-10-05') });
  });

  test('cannot delete training for other people', async () => {
    // GIVEN
    const trainerId01 = await createTrainer(app, 'trainer-name-1');
    const trainerId02 = await createTrainer(app, 'trainer-name-2');
    const trainingId = (await createTraining(app, trainerId01)).id;

    // WHEN
    const response = await request(app.getHttpServer())
      .delete(`/trainings/${trainingId}`)
      .set(
        'Authorization',
        `Bearer ${jwtLikeString(trainerId02, ['trainers'])}`,
      );

    expect(response.status).toBe(401);
  });
});
