import superagent from 'superagent';
import {
  TrainingCreateRequest,
  TrainingDto,
  TrainingQueryResponse,
  TrainingUpdateStatusRequest,
} from '@/lib/dto';
import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';
import {
  LocalApi,
  SERVER,
  USER_ID_ADMIN,
  USER_ID_TRAINER,
} from '@/api-tests/apiTestUtils';
import { TrainingStatus } from '@/generated/prisma/enums';
import { StatusCodes } from 'http-status-codes';

const TRAINER_ID = '502c79bc-e051-70f5-048c-5619e49e2383';
const COURSE_ID = 1;

const VALID_TRAINING_CREATE_REQUEST: TrainingCreateRequest = {
  date: '2000-12-31',
  userId: TRAINER_ID,
  participantCount: 5,
  compensationCents: 1000,
  courseId: COURSE_ID,
  comment: 'comment',
};

describe('/trainings', () => {
  test('created training is returned by GET', async () => {
    let trainingId;
    try {
      const training: TrainingCreateRequest = {
        date: '2000-12-31',
        userId: TRAINER_ID,
        participantCount: 5,
        compensationCents: 1000,
        courseId: COURSE_ID,
        comment: 'comment',
      };
      const resultPost = await superagent
        .post(`${SERVER}/api/trainings`)
        .send(training);

      const createdTraining = resultPost.body as TrainingDto;
      trainingId = createdTraining.id;
      expect(createdTraining.date).toBe(training.date);
      expect(createdTraining.userId).toBe(training.userId);
      expect(createdTraining.participantCount).toBe(training.participantCount);
      expect(createdTraining.compensationCents).toBe(
        training.compensationCents,
      );
      expect(createdTraining.courseId).toBe(training.courseId);
      expect(createdTraining.comment).toBe(training.comment);

      const resultGet = await superagent.get(
        `${SERVER}/api/trainings/${trainingId}`,
      );
      const retrievedTraining = resultGet.body as TrainingDto;
      expect(retrievedTraining.date).toBe(training.date);
      expect(retrievedTraining.userId).toBe(training.userId);
      expect(retrievedTraining.participantCount).toBe(
        training.participantCount,
      );
      expect(retrievedTraining.compensationCents).toBe(
        training.compensationCents,
      );
      expect(retrievedTraining.courseId).toBe(training.courseId);
      expect(retrievedTraining.comment).toBe(training.comment);
    } finally {
      if (trainingId) {
        await superagent.delete(`${SERVER}/api/trainings/${trainingId}`);
      }
    }
  });

  test('time of status transitions if recorded', async () => {
    let trainingId;
    try {
      const resultPost = await superagent
        .post(`${SERVER}/api/trainings`)
        .send(VALID_TRAINING_CREATE_REQUEST);

      const createdTraining = resultPost.body as TrainingDto;
      trainingId = createdTraining.id;
      expect(createdTraining.approvedAt).toBeNull();
      expect(createdTraining.compensatedAt).toBeNull();

      const approveRequest: TrainingUpdateStatusRequest = {
        status: 'APPROVED',
      };
      const resultApprove = await superagent
        .patch(`${SERVER}/api/trainings/${trainingId}`)
        .send(approveRequest);
      const approvedTraining = resultApprove.body as TrainingDto;
      expect(approvedTraining.status).toBe('APPROVED');
      const approvedTime = dayjs(approvedTraining.approvedAt!);
      expect(approvedTime.diff(dayjs())).toBeLessThan(1000);

      const compensateRequest: TrainingUpdateStatusRequest = {
        status: 'COMPENSATED',
      };
      const resultCompensated = await superagent
        .patch(`${SERVER}/api/trainings/${trainingId}`)
        .send(compensateRequest);
      const compensatedTraining = resultCompensated.body as TrainingDto;
      expect(compensatedTraining.status).toBe('COMPENSATED');
      const compensationTime = dayjs(compensatedTraining.compensatedAt!);
      expect(compensationTime.diff(dayjs())).toBeLessThan(1000);
    } finally {
      if (trainingId) {
        await superagent.delete(`${SERVER}/api/trainings/${trainingId}`);
      }
    }
  });

  test('allows to query by courseId', async () => {
    const courseId = 1;
    const api = new LocalApi();

    const createdTrainings = [];
    try {
      // GIVEN we have several trainings for both users
      for (const date of [
        '1999-01-01',
        '1999-08-01',
        '1999-12-01', // <-  in 1999
        '2025-01-01', // <- in another timeframe
      ]) {
        const t = await api.createTraining({
          date,
          courseId,
          userId: USER_ID_ADMIN,
        });
        createdTrainings.push(t);
        await api.transitionTraining(t.id, TrainingStatus.APPROVED);
        await api.transitionTraining(t.id, TrainingStatus.COMPENSATED);
      }
      for (const date of ['1999-04-01', '1999-11-11']) {
        const t = await api.createTraining({
          date,
          courseId,
          userId: USER_ID_TRAINER,
        });
        createdTrainings.push(t);
        await api.transitionTraining(t.id, TrainingStatus.APPROVED);
        await api.transitionTraining(t.id, TrainingStatus.COMPENSATED);
      }

      // AND a training for a different course
      const t1 = await api.createTraining({
        date: '1999-01-01',
        courseId: 2,
        userId: USER_ID_ADMIN,
      });
      createdTrainings.push(t1);
      await api.transitionTraining(t1.id, TrainingStatus.APPROVED);
      await api.transitionTraining(t1.id, TrainingStatus.COMPENSATED);

      // AND a training with status != COMPENSATED
      const t2 = await api.createTraining({
        date: '1999-01-01',
        courseId: courseId,
        userId: USER_ID_ADMIN,
      });
      createdTrainings.push(t2);
      await api.transitionTraining(t2.id, TrainingStatus.APPROVED);

      // WHEN we request all trainings for 1999 and course 1
      const response = await superagent.get(
        `${SERVER}/api/trainings?courseId=${courseId}&start=1999-01-01&end=1999-12-31&status=COMPENSATED&expand=user`,
      );
      expect(response.statusCode).toBe(StatusCodes.OK);
      const returnedTrainings = response.body as TrainingQueryResponse;
      expect(returnedTrainings.value).toHaveLength(5);

      // THEN we get the expected answer
    } finally {
      for (const t of createdTrainings) {
        await api.deleteTraining(t.id);
      }
    }
  });
});
