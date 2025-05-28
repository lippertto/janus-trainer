import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  CostCenterCreateRequest,
  CostCenterDto,
  CostCenterQueryResponseDto,
  ErrorDto,
} from '@/lib/dto';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';

async function getAllCostCenters(
  includeDeleted: boolean,
  costCenterId: number | null,
) {
  let filter;
  if (includeDeleted) {
    filter = {};
  } else {
    filter = { deletedAt: null };
  }
  if (costCenterId) {
    filter = { ...filter, costCenterId };
  }

  const result = await prisma.costCenter.findMany({ where: filter });
  return NextResponse.json({ value: result });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CostCenterQueryResponseDto | ErrorDto>> {
  const includeDeleted =
    request.nextUrl.searchParams.get('includeDeleted') === 'true';
  const costCenterIdString = request.nextUrl.searchParams.get('costCenterId');
  let costCenterId = null;
  if (costCenterIdString) {
    costCenterId = parseInt(costCenterIdString);
  }
  try {
    await allowAnyLoggedIn(request);
    return await getAllCostCenters(includeDeleted, costCenterId);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<CostCenterDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(
      CostCenterCreateRequest,
      await nextRequest.json(),
    );

    const result = await prisma.costCenter.create({ data: request });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
