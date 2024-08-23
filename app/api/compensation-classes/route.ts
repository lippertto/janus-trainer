import { NextRequest, NextResponse } from 'next/server';
import {
  CompensationClassCreateRequest,
  CompensationClassDto,
  CompensationClassQueryResponse,
  ErrorDto,
} from '@/lib/dto';
import { allowAnyLoggedIn, allowOnlyAdmins, handleTopLevelCatch, validateOrThrow } from '@/lib/helpers-for-api';
import { createCompensationClass } from '@/app/api/compensation-classes/createCompensationClass';
import prisma from '@/lib/prisma';


export async function GET(nextRequest: NextRequest): Promise<NextResponse<CompensationClassQueryResponse | ErrorDto>> {
  try {
    const expand = nextRequest.nextUrl.searchParams.get('expand');
    await allowAnyLoggedIn(nextRequest);
    let value = await prisma.compensationClass.findMany({
      where: {},
      include: { compensationValues: expand === 'compensationValues' },
    });
    const result = value.map((cc) => (
      {
        ...cc,
        compensationValues: cc.compensationValues ?? [],
      }
    ));
    return NextResponse.json({ value: result });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function POST(nextRequest: NextRequest): Promise<NextResponse<CompensationClassDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(CompensationClassCreateRequest, await nextRequest.json());
    return NextResponse.json(await createCompensationClass(request), { status: 201 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}