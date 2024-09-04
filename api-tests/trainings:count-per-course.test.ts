import { COURSE_1_NAME, COURSE_2_NAME, LocalApi } from '@/api-tests/apiTestUtils';
import superagent from 'superagent';
import { TrainingCountPerCourse, TrainingDto } from '@/lib/dto';
import { TrainingStatus } from '@prisma/client';

const SERVER = 'http://localhost:3000';
const api = new LocalApi(SERVER);

async function compensateTrainings(trainings: TrainingDto[]): Promise<void> {
  await Promise.all(
    trainings.map((t) => (
        api.transitionTraining(t.id, TrainingStatus.APPROVED)
      ),
    ),
  );

  await api.createPayment({ trainingIds: trainings.map((t) => t.id) });
}

test('happy case', async () => {
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

  const result = await superagent
    .post(`${SERVER}/api/trainings:count-per-course?year=2024`)
  ;
  expect(result.statusCode).toBe(200);

  const data = result.body as { value: TrainingCountPerCourse };
  expect(data.value).toHaveLength(2);
  expect(data.value).toContainEqual({ course: { name: COURSE_1_NAME, id: 1 }, count: 2 });
  expect(data.value).toContainEqual({
    course: { name: COURSE_2_NAME, id: 2 }, count: 3,
  });
});