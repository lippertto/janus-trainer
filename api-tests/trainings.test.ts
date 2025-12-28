import superagent from 'superagent';
import {
  TrainingCreateRequest,
  TrainingDto,
  TrainingUpdateStatusRequest,
} from '@/lib/dto';
import dayjs from 'dayjs';
import { describe, expect, test } from 'vitest';
import { SERVER } from '@/api-tests/apiTestUtils';

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
});
