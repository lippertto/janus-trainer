import { NextRequest, NextResponse } from 'next/server';
import { ErrorDto, PaymentCreateRequest, PaymentDto } from '@/lib/dto';
import {
  allowOnlyAdmins,
  ApiErrorBadRequest,
  getOwnUserId,
  handleTopLevelCatch, validateOrThrow,
  validateOrThrowOld,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';
import { Payment, UserInDb } from '@prisma/client';


async function createPayment(userId: string, request: PaymentCreateRequest): Promise<PaymentDto> {

  const user = await prisma.userInDb.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiErrorBadRequest(`User ${userId} does not exist`);
  }
  const now = new Date();
  const paymentData = {
    createdById: userId,
    createdAt: now,
  };
  const payment = await prisma.payment.create({ data: paymentData });

  await prisma.$transaction(
    request.trainingIds.map((tid) =>
      (prisma.training.update(
        {
          where: { id: tid },
          data: {
            status: 'COMPENSATED',
            paymentId: payment.id,
          },
        }))),
  );

  return {
    id: payment.id,
    user: user, createdAt: dayjs(now).toISOString(), trainingIds: request.trainingIds,
    totalCents: await totalCentsForPayment(payment.id),
  };
}

async function totalCentsForPayment(paymentId: number): Promise<number> {
  const totalCentsResult = await prisma.$queryRaw`
      SELECT SUM("compensationCents") as "totalCents"
      FROM "Training"
      WHERE "paymentId" = ${paymentId}
  ` as any;

  return Number(totalCentsResult[0].totalCents);
}


export async function POST(nextRequest: NextRequest): Promise<NextResponse<PaymentDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);

    const userId = await getOwnUserId(nextRequest)

    const request = await validateOrThrow(PaymentCreateRequest, await nextRequest.json())

    const result = await createPayment(userId, request);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

type PaymentsQueryResponse = {
  value: PaymentDto[]
}

async function onePaymentToDto(payment: Payment & { createdBy: UserInDb }): Promise<PaymentDto> {
  const totalCents = await totalCentsForPayment(payment.id);
  const trainingIds = await prisma.training.findMany({ where: { paymentId: payment.id }, select: { id: true } });
  return {
    id: payment.id,
    createdAt: dayjs(payment.createdAt).toISOString(),
    user: { name: payment.createdBy.name },
    totalCents,
    trainingIds: trainingIds.map((t) => (t.id)),
  };
}

async function listAllPayments(): Promise<PaymentDto[]> {
  const allPayments = await prisma.payment.findMany({ where: {}, include: { createdBy: true } });
  return Promise.all(allPayments.map((p) => onePaymentToDto(p)));
}


export async function GET(request: NextRequest): Promise<NextResponse<PaymentsQueryResponse | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);
    const result = await listAllPayments();
    return NextResponse.json({ value: result });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}