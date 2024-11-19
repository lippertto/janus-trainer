import superagent from 'superagent';
import { PaymentDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import { TrainingStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { LocalApi, USER_ID_ADMIN, USER_ID_TRAINER } from './apiTestUtils';
import { describe, expect, test } from 'vitest';

const SERVER = 'http://localhost:3000';
const api = new LocalApi(SERVER);

async function createAndValidatePayment(
  trainerId: string,
  trainingIds: number[],
  expectedCents: number,
) {
  // WHEN
  const payment = await api.createPayment({ userId: trainerId, trainingIds });

  // THEN
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
  const compensatedTime = dayjs(training.compensatedAt!);
  expect(compensatedTime.diff(dayjs())).toBeLessThan(1000);
}

describe('/payments', () => {
  test('happy case', async () => {
    await api.clearTrainings();
    // GIVEN
    const courseId = 1;
    const trainings: TrainingCreateRequest[] = [
      {
        date: '2000-12-31',
        userId: USER_ID_ADMIN,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-01-15',
        userId: USER_ID_ADMIN,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-02-15',
        userId: USER_ID_TRAINER,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-03-15',
        userId: USER_ID_ADMIN,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
      {
        date: '2001-04-01',
        userId: USER_ID_TRAINER,
        participantCount: 5,
        compensationCents: 1000,
        courseId: courseId,
        comment: '',
      },
    ];
    const trainingIds = await Promise.all(
      trainings.map(async (t) => (await api.createTraining(t)).id),
    );
    let paymentId1 = 0;
    let paymentId2 = 0;
    try {
      paymentId1 = await createAndValidatePayment(
        USER_ID_ADMIN,
        trainingIds.slice(0, 3),
        3000,
      );
      paymentId2 = await createAndValidatePayment(
        USER_ID_ADMIN,
        trainingIds.slice(3, 5),
        2000,
      );

      for (let tid of trainingIds) {
        await checkIfTrainingStatusIsCompensated(tid);
      }

      // check payment list
      const paymentListResponse = await superagent.get(
        `${SERVER}/api/payments`,
      );
      expect(paymentListResponse.statusCode).toEqual(200);
      const paymentList = paymentListResponse.body.value as PaymentDto[];

      const payment1 = paymentList[paymentList.length - 2];
      expect(payment1.trainingIds).toHaveLength(3);
      expect(payment1.totalCents).toBe(3000);

      const payment2 = paymentList[paymentList.length - 1];
      expect(payment2.trainingIds).toHaveLength(2);
      expect(payment2.totalCents).toBe(2000);
    } finally {
      // clean up
      await Promise.all([
        ...trainingIds.map((t) =>
          superagent.delete(`${SERVER}/api/trainings/${t}`),
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

describe('/payments?trainerid', () => {
  test('happy case', async () => {
    await api.clearTrainings();

    const training1ToBeIncludedInPayment1 = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 200,
    });
    const training2ToBeIncludedInPayment1 = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 300,
    });
    const trainingByDifferentTrainerToBeIncludedInPayment1 =
      await api.createTraining({
        userId: USER_ID_ADMIN,
        compensationCents: 400,
      });
    const trainingByDifferentTrainerToBeIncludedInPayment2 =
      await api.createTraining({
        userId: USER_ID_ADMIN,
        compensationCents: 500,
      });

    // put all trainings to APPROVED
    await Promise.all(
      [
        training1ToBeIncludedInPayment1,
        training2ToBeIncludedInPayment1,
        trainingByDifferentTrainerToBeIncludedInPayment1,
        trainingByDifferentTrainerToBeIncludedInPayment2,
      ].map(async (t) => {
        await api.transitionTraining(t.id, TrainingStatus.APPROVED);
      }),
    );

    // create payments
    await api.createPayment({
      trainingIds: [
        training1ToBeIncludedInPayment1.id,
        training2ToBeIncludedInPayment1.id,
        trainingByDifferentTrainerToBeIncludedInPayment1.id,
      ],
    });
    // create another payment
    await api.createPayment({
      trainingIds: [trainingByDifferentTrainerToBeIncludedInPayment2.id],
    });

    // WHEN we get the payments for one user
    const result = await api.getPaymentsForTrainer({
      trainerId: USER_ID_TRAINER,
    });
    // THEN
    expect(result).toHaveLength(1); // only one payment for this user
    const payment = result.find(
      (p) => p.trainingIds.indexOf(training1ToBeIncludedInPayment1.id) !== -1,
    );
    expect(payment).not.toBeNull();
  });
});
