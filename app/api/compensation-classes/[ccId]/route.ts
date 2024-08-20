import { NextRequest, NextResponse } from 'next/server';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import { CompensationClassDto, CompensationClassUpdateRequest, ErrorDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

async function deleteCompensationClass(id: number) {
  try {
    await prisma.compensationClass.delete({ where: { id } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      console.log(`id '${id}' not found`);
      return;
    }
    throw e;
  }
}

export async function DELETE(nextRequest: NextRequest,
                             { params }: { params: { ccId: number } },
): Promise<Response> {
  try {
    await allowOnlyAdmins(nextRequest);
    await deleteCompensationClass(idAsNumberOrThrow(params.ccId));
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function getCompensationClass(id: number, expandCompensationValues: boolean): Promise<CompensationClassDto | null> {
  return prisma.compensationClass.findUnique({
    where: {id },
    include: { compensationValues: expandCompensationValues },
  });
}

export async function GET(nextRequest: NextRequest,
                          { params }: { params: { ccId: number } },
): Promise<NextResponse<CompensationClassDto | ErrorDto>> {
  try {
    const expand = nextRequest.nextUrl.searchParams.get('expand');
    await allowAnyLoggedIn(nextRequest);
    const result = await getCompensationClass(
      idAsNumberOrThrow(params.ccId), expand === 'compensationValues');
    if (result == null) {
      return notFoundResponse();
    }
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PUT(nextRequest: NextRequest,
                          { params }: { params: { ccId: number } },
): Promise<NextResponse<CompensationClassDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request =  await validateOrThrow(CompensationClassUpdateRequest, await nextRequest.json());
    const id = idAsNumberOrThrow(params.ccId)
    const result = await prisma.compensationClass.update({where: {id}, data: request})
    if (result == null) {
      return notFoundResponse();
    }
    return NextResponse.json({...result, compensationValues: []});
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}