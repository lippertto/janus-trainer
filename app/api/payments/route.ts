import { NextRequest, NextResponse } from 'next/server';
import { ErrorDto, PaymentCreateRequest, PaymentDto } from '@/lib/dto';
import {
  allowNoOne,
  allowOnlyAdmins,
  ApiErrorBadRequest,
  emptyResponse,
  getOwnUserId,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';
import { Payment, UserInDb } from '@/generated/prisma/client';
import { logger } from '@/lib/logging';

async function validateAndFetchTrainersWithIban(trainingIds: number[]) {
  const trainings = await prisma.training.findMany({
    where: { id: { in: trainingIds } },
    select: { userId: true },
  });

  const uniqueTrainerIds = [...new Set(trainings.map((t) => t.userId))];

  const trainers = await prisma.userInDb.findMany({
    where: { id: { in: uniqueTrainerIds } },
    select: { id: true, email: true, iban: true },
  });

  const trainersWithoutIban = trainers.filter((t) => !t.iban);
  if (trainersWithoutIban.length > 0) {
    const trainerEmails = trainersWithoutIban.map((t) => t.email).join(', ');
    throw new ApiErrorBadRequest(
      `Cannot create payment: The following trainers do not have an IBAN set: ${trainerEmails}`,
    );
  }

  return trainers;
}

async function captureTrainerIbansForPayment(
  paymentId: number,
  trainers: Array<{ id: string; iban: string | null }>,
) {
  await prisma.paymentUserIban.createMany({
    data: trainers.map((trainer) => ({
      paymentId,
      userId: trainer.id,
      iban: trainer.iban!,
    })),
  });
}

async function markTrainingsAsCompensated(
  trainingIds: number[],
  paymentId: number,
  compensatedAt: Date,
) {
  await prisma.$transaction(
    trainingIds.map((tid) =>
      prisma.training.update({
        where: { id: tid },
        data: {
          status: 'COMPENSATED',
          compensatedAt,
          paymentId,
        },
      }),
    ),
  );
}

async function createPayment(
  userId: string,
  request: PaymentCreateRequest,
): Promise<PaymentDto> {
  const user = await prisma.userInDb.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiErrorBadRequest(`User ${userId} does not exist`);
  }

  const trainers = await validateAndFetchTrainersWithIban(request.trainingIds);

  const now = new Date();
  const payment = await prisma.payment.create({
    data: {
      createdById: userId,
      createdAt: now,
    },
  });

  await captureTrainerIbansForPayment(payment.id, trainers);
  await markTrainingsAsCompensated(request.trainingIds, payment.id, now);

  return {
    id: payment.id,
    user: user,
    createdAt: dayjs(now).toISOString(),
    trainingIds: request.trainingIds,
    totalCents: await totalCentsForPayment(payment.id),
  };
}

async function totalCentsForPayment(paymentId: number): Promise<number> {
  const totalCentsResult = (await prisma.$queryRaw`
      SELECT SUM("compensationCents") as "totalCents"
      FROM "Training"
      WHERE "paymentId" = ${paymentId}
  `) as any;

  return Number(totalCentsResult[0].totalCents);
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<PaymentDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);

    const userId = await getOwnUserId(nextRequest);
    const request = await validateOrThrow(
      PaymentCreateRequest,
      await nextRequest.json(),
    );

    const result = await createPayment(userId, request);
    logger.info(
      { userId },
      `Created payment for trainingIds: ${request.trainingIds}`,
    );
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

type PaymentsQueryResponse = {
  value: PaymentDto[];
};

async function onePaymentToDto(
  payment: Payment & { createdBy: UserInDb },
  trainerId?: string,
): Promise<PaymentDto> {
  const trainings = await prisma.training.findMany({
    where: { paymentId: payment.id, userId: trainerId },
    select: { id: true, compensationCents: true },
  });
  const totalCents = trainings
    .map((t) => t.compensationCents)
    .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  return {
    id: payment.id,
    createdAt: dayjs(payment.createdAt).toISOString(),
    user: { name: payment.createdBy.name },
    totalCents,
    trainingIds: trainings.map((t) => t.id),
  };
}

async function listPayments(
  trainerId?: string,
  startDate?: string,
  endDate?: string,
): Promise<PaymentDto[]> {
  const where: any = {};

  if (trainerId) {
    where.trainings = {
      some: {
        user: {
          id: trainerId,
        },
      },
    };
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const allPayments = await prisma.payment.findMany({
    where,
    include: { createdBy: true },
  });
  return Promise.all(allPayments.map((p) => onePaymentToDto(p, trainerId)));
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<PaymentsQueryResponse | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);

    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const start = request.nextUrl.searchParams.get('start');
    const end = request.nextUrl.searchParams.get('end');

    const value = await listPayments(
      trainerId ?? undefined,
      start ?? undefined,
      end ?? undefined,
    );
    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    await allowNoOne(request);
    await prisma.payment.deleteMany();
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
