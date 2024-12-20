import { LocalApi } from './apiTestUtils';
import superagent from 'superagent';
import { TrainingCountPerCourse, TrainingDto } from '@/lib/dto';
import { TrainingStatus } from '@prisma/client';
import { expect, test } from 'vitest';

const SERVER = 'http://localhost:3000';
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
