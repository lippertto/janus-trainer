import superagent from 'superagent';
import {
  COURSE_1_NAME,
  LocalApi,
  USER_ID_ADMIN,
  USER_ID_TRAINER,
  USER_NAME_ADMIN,
  USER_NAME_TRAINER,
} from '@/api-tests/apiTestUtils';

const SERVER = 'http://localhost:3000';
const api = new LocalApi(SERVER);

describe('/trainings:find-duplicates', () => {
  test('happy case', async () => {
    let t1, t2, t3, t4, t5;
    try {
      // GIVEN trainings are created with the same course and day
      t1 = await api.createTraining({
        date: '2023-04-05',
        courseId: 1,
        userId: USER_ID_ADMIN,
      });
      t2 = await api.createTraining({
        date: '2023-04-05',
        courseId: 1,
        userId: USER_ID_TRAINER,
      });
      t3 = await api.createTraining({
        date: '2023-04-05',
        courseId: 1,
        userId: USER_ID_ADMIN,
      });
      // AND a training that was created on another day
      t4 = await api.createTraining({
        date: '2023-04-06',
        courseId: 1,
        userId: USER_ID_TRAINER,
      });
      // AND a training that was created for a different course
      t5 = await api.createTraining({
        date: '2023-04-05',
        courseId: 2,
        userId: USER_ID_TRAINER,
      });
      // WHEN we request to find duplicates for one training
      const result = (
        await superagent.post(
          `${SERVER}/api/trainings:find-duplicates?trainingIds=${t1.id}`,
        )
      ).body;
      expect(result.value).toHaveLength(2);
      // THEN the other ones are returned
      expect(result.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            queriedId: t1.id,
            duplicateId: t2.id,
            duplicateTrainerName: USER_NAME_TRAINER,
            duplicateCourseName: COURSE_1_NAME,
          }),
          expect.objectContaining({
            queriedId: t1.id,
            duplicateId: t3.id,
            duplicateTrainerName: USER_NAME_ADMIN,
            duplicateCourseName: COURSE_1_NAME,
          }),
        ]),
      );
    } finally {
      for (const t of [t1, t2, t3, t4, t5]) {
        if (t) {
          await api.deleteTraining(t.id);
        }
      }
    }
  });

  test('returns bad request on bad request', async () => {
    let receivedStatus = 0;
    await superagent
      .post(`${SERVER}/api/trainings:find-duplicates`)
      .catch((e) => {
        receivedStatus = e.response.status;
      });
    expect(receivedStatus).toBe(400);

    receivedStatus = 0;
    await superagent
      .post(`${SERVER}/api/trainings:find-duplicates?trainingIds=123,abc`)
      .catch((e) => {
        receivedStatus = e.response.status;
      });
    expect(receivedStatus).toBe(400);
  });
});
