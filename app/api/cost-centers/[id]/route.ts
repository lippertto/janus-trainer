import { NextRequest, NextResponse } from 'next/server';
import {
  allowOnlyAdmins,
  conflictResponse,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { CostCenterDto, CostCenterUpdateRequest, ErrorDto } from '@/lib/dto';
import { logger } from '@/lib/logging';

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await allowOnlyAdmins(request);

    const idAsNumber = idAsNumberOrThrow(params.id);

    const costCenter = await prisma.costCenter.findUnique({
      where: { id: idAsNumber },
    });
    if (!costCenter) return emptyResponse();

    const course = await prisma.course.findFirst({
      where: { costCenterId: idAsNumber, deletedAt: null },
    });
    if (course) {
      logger.info(
        `Not deleting cost center ${idAsNumber} because ${course.id} still references it.`,
      );
      return conflictResponse(
        `Course ${course.name} ${course.deletedAt ? '(deleted)' : ''} still references cost-center. Will not delete it.`,
        'CostCenterIsStillReferenced',
      );
    }

    await prisma.costCenter.update({
      where: { id: idAsNumber },
      data: { deletedAt: new Date() },
    });
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PUT(
  nextRequest: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse<CostCenterDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);

    const request = await validateOrThrow(
      CostCenterUpdateRequest,
      await nextRequest.json(),
    );

    const result = await prisma.costCenter.update({
      where: { id: idAsNumberOrThrow(params.id) },
      data: request,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
