import {
  COURSE_1_ID,
  COURSE_2_ID,
  LocalApi,
  USER_ID_TRAINER,
} from '@/api-tests/apiTestUtils';
import superagent from 'superagent';

const SERVER = 'http://localhost:3000';
const api = new LocalApi(SERVER);

describe('/trainer-reports:generate-pdf', () => {
  test('happy case', async () => {
    await api.clearTrainings();

    await api.createTraining({
      date: '2024-03-04',
      userId: USER_ID_TRAINER,
      compensationCents: 9000,
      courseId: COURSE_1_ID,
    });
    await api.createTraining({
      date: '2024-04-05',
      userId: USER_ID_TRAINER,
      compensationCents: 7000,
      courseId: COURSE_1_ID,
    });
    await api.createTraining({
      date: '2024-05-06',
      userId: USER_ID_TRAINER,
      compensationCents: 8000,
      courseId: COURSE_2_ID,
    });

    const response = await superagent
      .post(
        `${SERVER}/api/trainer-reports:generate-pdf?trainerId=${USER_ID_TRAINER}&start=2024-01-01&end=2024-12-31`,
      )
      .responseType('blob');
    expect(response.status).toBe(200);

    expect(response.headers['content-type']).toBe('application/pdf');

    const pdfData = response.body as Uint8Array;
    expect(pdfData).not.toBeFalsy();
  });
});
