import {
  allowOnlyAdmins,
  badRequestResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorDto, HolidayDto, HolidayUpdateRequest } from '@/lib/dto';

async function doDELETE(id: string) {
  const idAsNumber = parseInt(id);
  if (!idAsNumber) return badRequestResponse('id is not valid');

  await prisma.holiday.delete({ where: { id: idAsNumber } });

  return new Response(null, { status: 204 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    await allowOnlyAdmins(request);
    return await doDELETE(params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PUT(
  nextRequest: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<ErrorDto | HolidayDto>> {
  try {
    await allowOnlyAdmins(nextRequest);

    const id = idAsNumberOrThrow(params.id);
    const holiday = prisma.holiday.findUnique({ where: { id } });
    if (!holiday) {
      return notFoundResponse();
    }

    const request = await validateOrThrow(
      HolidayUpdateRequest,
      await nextRequest.json(),
    );

    return NextResponse.json(
      await prisma.holiday.update({ where: { id }, data: request }),
    );
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
