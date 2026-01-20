import { describe, it, expect } from 'vitest';
import {
  LocalApi,
  USER_ID_TRAINER,
  USER_ID_ADMIN,
  SERVER,
} from './apiTestUtils';
import { TrainingStatus } from '@/generated/prisma/client';
import superagent from 'superagent';
import { UserDto, CompensationDto } from '@/lib/dto';

/**
 * Test suite for Payment IBAN Capture feature
 *
 * Requirements:
 * - Payment creation must validate that all trainers have IBANs set
 * - Payment creation must capture each trainer's IBAN to PaymentUserIban table
 * - One PaymentUserIban record per unique trainer (no duplicates)
 * - IBAN captured must be the trainer's current IBAN at payment creation time
 */

const api = new LocalApi();

describe('Payment IBAN Capture', () => {
  // Base functionality test list - convert ONE at a time to executable tests

  it('should reject payment creation when single trainer has NULL IBAN', async () => {
    // GIVEN: A trainer with NULL IBAN
    const trainerResponse = await superagent.get(
      `${SERVER}/api/users/${USER_ID_TRAINER}?expand=cognito`,
    );
    const trainer = trainerResponse.body as UserDto;
    const originalIban = trainer.iban;

    try {
      // Set IBAN to NULL
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: null,
      });

      // Verify IBAN was actually set to NULL
      const verifyResponse = await superagent.get(
        `${SERVER}/api/users/${USER_ID_TRAINER}?expand=cognito`,
      );
      const verifiedTrainer = verifyResponse.body as UserDto;
      expect(verifiedTrainer.iban).toBeNull();

      // GIVEN: An approved training for this trainer
      const training = await api.createTraining({
        userId: USER_ID_TRAINER,
        compensationCents: 1000,
      });
      await api.transitionTraining(training.id, TrainingStatus.APPROVED);

      try {
        // WHEN: Attempting to create a payment
        await api.createPayment({
          trainingIds: [training.id],
        });

        // THEN: Should not reach here - payment creation should fail
        expect.fail('Payment creation should have been rejected');
      } catch (error: any) {
        // THEN: Payment creation is rejected with Bad Request
        expect(error.status).toBe(400);
        expect(error.response?.body?.error?.message).toContain('IBAN');
      } finally {
        await api.deleteTraining(training.id);
      }
    } finally {
      // Cleanup: restore original IBAN
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: originalIban,
      });
    }
  });

  it('should reject payment creation when one of multiple trainers has NULL IBAN', async () => {
    // GIVEN: Two trainers, one with IBAN and one without
    const trainer1Response = await superagent.get(
      `${SERVER}/api/users/${USER_ID_TRAINER}?expand=cognito`,
    );
    const trainer1 = trainer1Response.body as UserDto;
    const trainer1OriginalIban = trainer1.iban;

    const trainer2Response = await superagent.get(
      `${SERVER}/api/users/${USER_ID_ADMIN}?expand=cognito`,
    );
    const trainer2 = trainer2Response.body as UserDto;
    const trainer2OriginalIban = trainer2.iban;

    try {
      // Set trainer1's IBAN to NULL
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: null,
      });

      // GIVEN: Approved trainings for both trainers
      const training1 = await api.createTraining({
        userId: USER_ID_TRAINER,
        compensationCents: 1000,
      });
      const training2 = await api.createTraining({
        userId: USER_ID_ADMIN,
        compensationCents: 1000,
      });
      await api.transitionTraining(training1.id, TrainingStatus.APPROVED);
      await api.transitionTraining(training2.id, TrainingStatus.APPROVED);

      try {
        // WHEN: Attempting to create a payment for both trainers
        await api.createPayment({
          trainingIds: [training1.id, training2.id],
        });

        // THEN: Should not reach here - payment creation should fail
        expect.fail('Payment creation should have been rejected');
      } catch (error: any) {
        // THEN: Payment creation is rejected with Bad Request
        expect(error.status).toBe(400);
        expect(error.response?.body?.error?.message).toContain('IBAN');
        expect(error.response?.body?.error?.message).toContain(trainer1.email);
      } finally {
        await api.deleteTraining(training1.id);
        await api.deleteTraining(training2.id);
      }
    } finally {
      // Cleanup: restore original IBANs
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: trainer1OriginalIban,
      });
      await superagent.patch(`${SERVER}/api/users/${USER_ID_ADMIN}`).send({
        iban: trainer2OriginalIban,
      });
    }
  });

  it('should create PaymentUserIban record when creating payment for single trainer', async () => {
    // GIVEN: A trainer with an IBAN
    const trainerResponse = await superagent.get(
      `${SERVER}/api/users/${USER_ID_TRAINER}?expand=cognito`,
    );
    const trainer = trainerResponse.body as UserDto;
    expect(trainer).not.toBeNull();
    expect(trainer.iban).not.toBeNull();
    const originalIban = trainer.iban;

    // GIVEN: An approved training for this trainer
    const training = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 1000,
    });
    await api.transitionTraining(training.id, TrainingStatus.APPROVED);

    try {
      // WHEN: Creating a payment for this training
      const payment = await api.createPayment({
        trainingIds: [training.id],
      });

      // WHEN: Trainer updates their IBAN to a new value
      const newIban = 'DE89370400440532013000';
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: newIban,
      });

      // THEN: Compensations API shows the ORIGINAL IBAN (captured at payment time)
      // NOT the new IBAN
      const compensationsResponse = await superagent.get(
        `${SERVER}/api/compensations?paymentId=${payment.id}`,
      );
      const compensations = compensationsResponse.body
        .value as CompensationDto[];

      expect(compensations).toHaveLength(1);
      expect(compensations[0].user.id).toBe(USER_ID_TRAINER);
      expect(compensations[0].iban).toBe(originalIban);
      expect(compensations[0].iban).not.toBe(newIban);
    } finally {
      // Cleanup: restore original IBAN
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: originalIban,
      });
      await api.deleteTraining(training.id);
    }
  });

  it('should create PaymentUserIban records for multiple trainers in same payment', async () => {
    // GIVEN: Two trainers with IBANs
    const trainer1Response = await superagent.get(
      `${SERVER}/api/users/${USER_ID_TRAINER}?expand=cognito`,
    );
    const trainer1 = trainer1Response.body as UserDto;
    const trainer1OriginalIban = trainer1.iban;
    expect(trainer1OriginalIban).not.toBeNull();

    const trainer2Response = await superagent.get(
      `${SERVER}/api/users/${USER_ID_ADMIN}?expand=cognito`,
    );
    const trainer2 = trainer2Response.body as UserDto;
    const trainer2OriginalIban = trainer2.iban;
    expect(trainer2OriginalIban).not.toBeNull();

    // GIVEN: Approved trainings for both trainers
    const training1 = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 1000,
    });
    const training2 = await api.createTraining({
      userId: USER_ID_ADMIN,
      compensationCents: 2000,
    });
    await api.transitionTraining(training1.id, TrainingStatus.APPROVED);
    await api.transitionTraining(training2.id, TrainingStatus.APPROVED);

    try {
      // WHEN: Creating a payment for both trainers
      const payment = await api.createPayment({
        trainingIds: [training1.id, training2.id],
      });

      // WHEN: Both trainers update their IBANs to new values
      const newIban1 = 'DE89370400440532013000';
      const newIban2 = 'DE68210501700012345678';
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: newIban1,
      });
      await superagent.patch(`${SERVER}/api/users/${USER_ID_ADMIN}`).send({
        iban: newIban2,
      });

      // THEN: Compensations API shows ORIGINAL IBANs for both trainers
      const compensationsResponse = await superagent.get(
        `${SERVER}/api/compensations?paymentId=${payment.id}`,
      );
      const compensations = compensationsResponse.body
        .value as CompensationDto[];

      // Should have 2 compensations (one per trainer)
      expect(compensations).toHaveLength(2);

      // Find compensations by user ID
      const comp1 = compensations.find((c) => c.user.id === USER_ID_TRAINER);
      const comp2 = compensations.find((c) => c.user.id === USER_ID_ADMIN);

      expect(comp1).toBeDefined();
      expect(comp2).toBeDefined();

      // Verify original IBANs are captured (not new ones)
      expect(comp1!.iban).toBe(trainer1OriginalIban);
      expect(comp1!.iban).not.toBe(newIban1);

      expect(comp2!.iban).toBe(trainer2OriginalIban);
      expect(comp2!.iban).not.toBe(newIban2);
    } finally {
      // Cleanup: restore original IBANs
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: trainer1OriginalIban,
      });
      await superagent.patch(`${SERVER}/api/users/${USER_ID_ADMIN}`).send({
        iban: trainer2OriginalIban,
      });
      await api.deleteTraining(training1.id);
      await api.deleteTraining(training2.id);
    }
  });

  it('should create only one PaymentUserIban record when same trainer has multiple trainings', async () => {
    // GIVEN: A trainer with an IBAN
    const trainerResponse = await superagent.get(
      `${SERVER}/api/users/${USER_ID_TRAINER}?expand=cognito`,
    );
    const trainer = trainerResponse.body as UserDto;
    const originalIban = trainer.iban;
    expect(originalIban).not.toBeNull();

    // GIVEN: Multiple approved trainings for the same trainer
    const training1 = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 1000,
    });
    const training2 = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 1500,
    });
    const training3 = await api.createTraining({
      userId: USER_ID_TRAINER,
      compensationCents: 2000,
    });
    await api.transitionTraining(training1.id, TrainingStatus.APPROVED);
    await api.transitionTraining(training2.id, TrainingStatus.APPROVED);
    await api.transitionTraining(training3.id, TrainingStatus.APPROVED);

    try {
      // WHEN: Creating a payment for all three trainings
      const payment = await api.createPayment({
        trainingIds: [training1.id, training2.id, training3.id],
      });

      // WHEN: Trainer updates their IBAN to a new value
      const newIban = 'DE89370400440532013000';
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: newIban,
      });

      // THEN: Compensations API shows only ONE compensation entry with original IBAN
      // (grouped by trainer, so multiple trainings = one compensation entry)
      const compensationsResponse = await superagent.get(
        `${SERVER}/api/compensations?paymentId=${payment.id}`,
      );
      const compensations = compensationsResponse.body
        .value as CompensationDto[];

      // Should have only 1 compensation (all trainings for same trainer grouped)
      expect(compensations).toHaveLength(1);
      expect(compensations[0].user.id).toBe(USER_ID_TRAINER);
      expect(compensations[0].iban).toBe(originalIban);
      expect(compensations[0].iban).not.toBe(newIban);

      // Should aggregate all three trainings
      expect(compensations[0].totalTrainings).toBe(3);
      expect(compensations[0].totalCompensationCents).toBe(4500); // 1000 + 1500 + 2000
    } finally {
      // Cleanup: restore original IBAN
      await superagent.patch(`${SERVER}/api/users/${USER_ID_TRAINER}`).send({
        iban: originalIban,
      });
      await api.deleteTraining(training1.id);
      await api.deleteTraining(training2.id);
      await api.deleteTraining(training3.id);
    }
  });
});
