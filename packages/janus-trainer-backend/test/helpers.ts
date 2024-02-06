import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TrainingResponse } from 'src/trainings/dto/training-response';
import request from 'supertest';
import dayjs from 'dayjs';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { v4 as uuidv4 } from 'uuid';
import { DisciplineDto } from 'janus-trainer-dto';

let globalCompensationCents = 100;
let globalTrainingDate = dayjs('2000-01-01');
let discipline: DisciplineDto | null = null;

/** Creates user and trainer entities and adds the corresponding relationship. */
export async function createTrainer(
  app: INestApplication,
  name: string,
): Promise<string> {
  let userId: string;
  await request(app.getHttpServer())
    .post('/users')
    .set('Authorization', `Bearer ${JWT_WITH_ADMIN_GROUP}`)
    .send({
      email: 'email@example.com',
      name: name,
      groups: ['trainers'],
      iban: 'NL28ABNA2504374283',
    })
    .expect(201)
    .then((response) => {
      userId = response.body.id;
    });
  return userId;
}

export async function createApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  // we need to manually set this up because we do not use boostrap() from main.ts
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  await app.init();
  return app;
}

export async function createTraining(
  app: INestApplication,
  userId: string,
  fields: { compensationCents?: number; date?: dayjs.Dayjs } = {},
): Promise<TrainingResponse> {
  if (!discipline) {
    discipline = await createDiscipline(app, 'global-test-discipline');
  }

  let result = null;
  await request(app.getHttpServer())
    .post('/trainings')
    .set('Authorization', `Bearer ${JWT_WITH_ADMIN_GROUP}`)
    .send({
      compensationCents: fields.compensationCents ?? globalCompensationCents,
      date: (fields.date ?? globalTrainingDate).format('YYYY-MM-DD'),
      discipline: 'discipline',
      group: 'group',
      participantCount: 5,
      userId: userId,
      disciplineId: discipline.id,
    })
    .then((response) => {
      if (response.statusCode != 201) {
        throw new Error(
          `Could not create training. Message is ${JSON.stringify(
            response.body,
          )}`,
        );
      }
      expect(response.body).toMatchObject({
        compensationCents: fields.compensationCents ?? globalCompensationCents,
        date: (fields.date ?? globalTrainingDate).format('YYYY-MM-DD'),
        group: 'group',
        participantCount: 5,
        user: expect.objectContaining({ id: userId }),
      });
      result = response.body;
    });
  if (fields.compensationCents) {
    globalCompensationCents = globalCompensationCents + 1;
  }
  if (fields.date) {
    globalTrainingDate = globalTrainingDate.add(1, 'day');
  }
  return result;
}

export async function setTrainingStatus(
  app: INestApplication,
  trainingId: string,
  status: string,
): Promise<void> {
  await request(app.getHttpServer())
    .patch(`/trainings/${trainingId}`)
    .set('Authorization', `Bearer ${JWT_WITH_ADMIN_GROUP}`)
    .send({ status: status })
    .expect(200)
    .then((response) => {
      expect(response.body.status).toBe(status);
    });
}

export const JWT_WITH_ADMIN_GROUP = jwtLikeString('cognito-id-admin-user', [
  'admins',
]);
// cognito id of trainer is cognito-d
export const JWT_WITH_TRAINER_GROUP = jwtLikeString('cognito-id-trainer-user', [
  'trainers',
]);

/**
 * Starts the postgres container. Before the container is started, the corresponding environment variables are set.
 * You need to reset them after your tests are finished.
 */
export async function startPostgres(
  currentEnv,
): Promise<StartedPostgreSqlContainer> {
  process.env = {
    ...currentEnv,
    DOCKER_HOST:
      '/Users/tlippert/.local/share/containers/podman/machine/qemu/podman.sock',
    TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE: '/var/run/docker.sock',
    TESTCONTAINERS_RYUK_DISABLED: 'true',
  };
  const container = await new PostgreSqlContainer(
    'postgres:13.3-alpine',
  ).start();
  process.env = {
    ...process.env,
    POSTGRES_HOST: container.getHost(),
    POSTGRES_USERNAME: container.getUsername(),
    POSTGRES_PASSWORD: container.getPassword(),
    POSTGRES_DATABASE: container.getDatabase(),
    POSTGRES_PORT: container.getPort().toString(),
    SYNCHRONIZE_DATABASE: '1',
  };
  return container;
}

/**
 * Creates a string that can be used as a JWT.
 * The authentication is disabled in the tests, so we just need a JWT which has a payload with the expected fields
 */
export function jwtLikeString(cognitoId: string, groups: string[]): string {
  const payload = btoa(
    JSON.stringify({ sub: cognitoId, 'cognito:groups': groups }),
  );
  return `header.${payload}.signature`;
}

export async function createDiscipline(
  app: INestApplication,
  name?: string,
): Promise<DisciplineDto> {
  if (!name) {
    name = uuidv4();
  }
  const response = await request(app.getHttpServer())
    .post('/disciplines')
    .set('Authorization', `Bearer ${JWT_WITH_ADMIN_GROUP}`)
    .send({
      name,
    });
  expect(response.statusCode).toBe(201);
  return response.body as DisciplineDto;
}
