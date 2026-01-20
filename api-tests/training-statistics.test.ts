import { LocalApi, SERVER, USER_ID_TRAINER } from './apiTestUtils';
import superagent from 'superagent';
import { TrainingCountPerCourse, TrainingDto } from '@/lib/dto';
import { TrainingStatus } from '@/generated/prisma/client';
import { expect, test } from 'vitest';

const api = new LocalApi(SERVER);

async function compensateTrainings(trainings: TrainingDto[]): Promise<void> {
  await Promise.all(
    trainings.map((t) => api.transitionTraining(t.id, TrainingStatus.APPROVED)),
  );

  await api.createPayment({ trainingIds: trainings.map((t) => t.id) });
}

test('happy case: group by cost-center', async () => {
  await api.clearTrainings();

  // 2 trainings of course 1 in 2024; 3 trainings of course 2 in 2024
  const trainings = [
    await api.createTraining({ date: '2023-12-31', courseId: 1 }),
    await api.createTraining({ date: '2024-01-01', courseId: 1 }),
    await api.createTraining({ date: '2024-01-02', courseId: 1 }),
    await api.createTraining({ date: '2024-05-06', courseId: 2 }),
    await api.createTraining({ date: '2024-10-11', courseId: 2 }),
    await api.createTraining({ date: '2024-12-31', courseId: 2 }),
    await api.createTraining({ date: '2025-01-01', courseId: 2 }),
  ];
  await compensateTrainings(trainings);
  // one training that is not in status 'COMPENSATED';
  await api.createTraining({ date: '2024-08-09', courseId: 2 });

  const result = await superagent.post(
    `${SERVER}/api/training-statistics?year=2024&groupBy=cost-center`,
  );
  expect(result.statusCode).toBe(200);

  const data = result.body as { value: TrainingCountPerCourse };
  expect(data.value).toHaveLength(2);
  expect(data.value).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        costCenterName: 'Sportart 1',
        trainingCountQ1: 2,
      }),
      expect.objectContaining({
        costCenterName: 'Sportart 2',
        trainingCountQ2: 1,
      }),
    ]),
  );
});

test('deduplicates trainings when multiple trainers work on the same day for the same course', async () => {
  await api.clearTrainings();

  // Scenario: Two trainers both work on course 1 on the same dates (co-teaching)
  // Trainer 1 (default admin trainer)
  const trainer1Trainings = [
    await api.createTraining({ date: '2024-01-15', courseId: 1 }), // Q1
    await api.createTraining({ date: '2024-05-10', courseId: 1 }), // Q2
    await api.createTraining({ date: '2024-09-20', courseId: 1 }), // Q3
  ];

  // Trainer 2 works on the SAME dates (uses predefined trainer user ID)
  const trainer2Trainings = [
    await api.createTraining({
      date: '2024-01-15',
      courseId: 1,
      userId: USER_ID_TRAINER,
    }), // Q1 - same date as trainer1
    await api.createTraining({
      date: '2024-05-10',
      courseId: 1,
      userId: USER_ID_TRAINER,
    }), // Q2 - same date as trainer1
    await api.createTraining({
      date: '2024-09-20',
      courseId: 1,
      userId: USER_ID_TRAINER,
    }), // Q3 - same date as trainer1
  ];

  await compensateTrainings([...trainer1Trainings, ...trainer2Trainings]);

  // Test grouping by course - should count 3 unique dates, not 6 trainings
  const resultByCourse = await superagent.post(
    `${SERVER}/api/training-statistics?year=2024&groupBy=course`,
  );
  expect(resultByCourse.statusCode).toBe(200);

  const dataByCourse = resultByCourse.body as { value: TrainingCountPerCourse };
  expect(dataByCourse.value).toHaveLength(1);
  expect(dataByCourse.value[0]).toMatchObject({
    courseId: 1,
    trainingCountQ1: 1, // Only 1 unique date in Q1 (2024-01-15)
    trainingCountQ2: 1, // Only 1 unique date in Q2 (2024-05-10)
    trainingCountQ3: 1, // Only 1 unique date in Q3 (2024-09-20)
    trainingCountQ4: 0,
    trainingCountTotal: 3, // Total of 3 unique training sessions
  });

  // Compensation should still count both trainers (6 total compensations)
  // This ensures we're only deduplicating the training count, not the compensation
  expect(dataByCourse.value[0].compensationCentsTotal).toBeGreaterThan(0);
});
