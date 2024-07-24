import superagent from 'superagent';
import { PaymentDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import { TrainingStatus } from '@prisma/client';


const SERVER = 'http://localhost:3000';


async function createAndValidatePayment(trainerId: string, trainingIds: number[], expectedCents: number) {
  // WHEN
  const result = await superagent
    .post(`${SERVER}/api/payments`)
    .send({
      userId: trainerId,
      trainingIds: trainingIds,
    })
  ;

  // THEN
  const payment = result.body as PaymentDto;

  expect(payment.user.name).toBe('Test-User Admin');
  expect(payment.trainingIds).toEqual(expect.arrayContaining(trainingIds));
  expect(payment.totalCents).toEqual(expectedCents);

  return payment.id;
}

async function checkIfTrainingStatusIsCompensated(trainingId: number) {
  const result = await superagent.get(`${SERVER}/api/trainings/${trainingId}`);
  expect(result.statusCode).toBe(200);
  const training = result.body as TrainingDto;
  expect(training.status).toBe(TrainingStatus.COMPENSATED);
}

describe('/payments', () => {
  test('happy case', async () => {
    // GIVEN
    const trainerId1 = '502c79bc-e051-70f5-048c-5619e49e2383';
    const trainerId2 = '80ac598c-e0b1-7040-5e0e-6fd257a53699';
    const courseId = 1;
    const trainings: TrainingCreateRequest[] = [
      { date: '2000-12-31', userId: trainerId1, participantCount: 5, compensationCents: 1000, courseId: courseId },
      { date: '2001-01-15', userId: trainerId1, participantCount: 5, compensationCents: 1000, courseId: courseId },
      { date: '2001-02-15', userId: trainerId2, participantCount: 5, compensationCents: 1000, courseId: courseId },
      { date: '2001-03-15', userId: trainerId1, participantCount: 5, compensationCents: 1000, courseId: courseId },
      { date: '2001-04-01', userId: trainerId2, participantCount: 5, compensationCents: 1000, courseId: courseId },
    ];
    const trainingIds = await Promise.all(
      trainings.map(async (t) => {
        const result = await superagent
          .post(`${SERVER}/api/trainings`)
          .send(t);
        return result.body.id as number;
      }));

    let paymentId1 = 0;
    let paymentId2 = 0;
    try {
      paymentId1 = await createAndValidatePayment(trainerId1, trainingIds.slice(0, 3), 3000);
      paymentId2 = await createAndValidatePayment(trainerId1, trainingIds.slice(3, 5), 2000);

      for (let tid of trainingIds) {
        await checkIfTrainingStatusIsCompensated(tid);
      }

      // check payment list
      const paymentListResponse = await superagent.get(`${SERVER}/api/payments`);
      expect(paymentListResponse.statusCode).toEqual(200);
      const paymentList = paymentListResponse.body.value as PaymentDto[];
      expect(paymentList).toHaveLength(2);

      expect(paymentList[0].trainingIds).toHaveLength(3);
      expect(paymentList[0].totalCents).toBe(3000);

      expect(paymentList[1].trainingIds).toHaveLength(2);
      expect(paymentList[1].totalCents).toBe(2000);

    } finally {
      // clean up
      await Promise.all([...
        trainingIds.map((t) => (
            superagent.delete(`${SERVER}/api/trainings/${t}`)
          ),
        ),
      ]);
      if (paymentId1) {
        await superagent.delete(`${SERVER}/api/payments/${paymentId1}`);
      }
      if (paymentId2) {
        await superagent.delete(`${SERVER}/api/payments/${paymentId2}`);
      }
    }
  });

});