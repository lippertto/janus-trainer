import superagent from 'superagent';
import { TrainingCreateRequest } from '@/lib/dto';
import { describe, expect, test } from 'vitest';

const SERVER = 'http://localhost:3000';

describe('/trainings:summarize', () => {
  test('happy case', async () => {
    // GIVEN
    const trainerId1 = '502c79bc-e051-70f5-048c-5619e49e2383';
    const trainerId2 = '80ac598c-e0b1-7040-5e0e-6fd257a53699';
    const courseId = 1;
    const trainings: TrainingCreateRequest[] = [
      {
        date: '2000-12-31',
        userId: trainerId1,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-01-15',
        userId: trainerId1,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-02-15',
        userId: trainerId2,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-03-15',
        userId: trainerId1,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-04-01',
        userId: trainerId2,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
    ];
    const trainingIds = await Promise.all(
      trainings.map(async (t) => {
        const result = await superagent.post(`${SERVER}/api/trainings`).send(t);
        return result.body.id as number;
      }),
    );

    try {
      // WHEN
      const result = await superagent.post(
        `${SERVER}/api/trainings:summarize?startDate=2001-01-01&endDate=2001-03-31`,
      );

      // THEN
      expect(result.body).toHaveProperty('value');
      expect(result.body.value).toHaveLength(2);
      expect(result.body.value).toContainEqual({
        trainerId: trainerId1,
        trainerName: 'Test-User Admin',
        newTrainingCount: 2,
        approvedTrainingCount: 0,
      });
      expect(result.body.value).toContainEqual({
        trainerId: trainerId2,
        trainerName: 'Test-User Trainer',
        newTrainingCount: 1,
        approvedTrainingCount: 0,
      });
    } finally {
      // clean up
      await Promise.all(
        trainingIds.map((t) =>
          superagent.delete(`${SERVER}/api/trainings/${t}`),
        ),
      );
    }
  });

  test('start and end dates have to be provided', async () => {
    let caught = false;
    // WHEN
    await superagent
      .post(`${SERVER}/api/trainings:summarize?startDate=2001-01-01`)
      .catch((e) => {
        caught = true;
      });
    // THEN
    expect(caught).toBe(true);
  });

  test('end date has to be set', async () => {
    let caught = false;
    // WHEN
    await superagent
      .post(`${SERVER}/api/trainings:summarize?endDate=2001-01-01`)
      .catch((e) => {
        caught = true;
      });
    // THEN
    expect(caught).toBe(true);
  });
});
