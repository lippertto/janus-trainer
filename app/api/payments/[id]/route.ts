import { NextRequest } from 'next/server';
import {
  allowNoOne,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';

/**
 * Delete a payment.
 * This method is only intended for cleanup in API tests.
 * If this method becomes publicly accessible, we must reset the status
 * in the trainings in this method.
 */
async function deletePayment(idAsString: string) {
  const id = idAsNumberOrThrow(idAsString);
  await prisma.payment.delete({ where: { id } });
  return emptyResponse();
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await allowNoOne(request);
    return await deletePayment(params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
