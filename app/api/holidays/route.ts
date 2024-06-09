import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Holiday, Prisma } from '@prisma/client';
import { ErrorDto } from '@/lib/dto';
import { handleTopLevelCatch, errorResponse } from '@/lib/helpers-for-api';
import { allowAnyLoggedIn, allowOnlyAdmins } from '@/lib/helpers-for-api';

export type HolidayQueryResult = {
  value: Holiday[];
};

function convertStringToNumberArray(str: string): number[] {
  // Split the string by comma (",") with optional whitespace around it
  const stringArray = str.split(/\s*,\s*/);

  // Convert each element in the string array to a number
  const numberArray = stringArray.map(Number);

  return numberArray;
}

async function doGET(
  request: NextRequest,

) {
  await allowAnyLoggedIn(request);

  const yearAsString = request.nextUrl.searchParams.get('year');
  if (!yearAsString) {
    return errorResponse('Year parameter is missing', 400);
  }

  const years = convertStringToNumberArray(yearAsString);
  if (years.length === 0) {
    return errorResponse('bad year parameter', 400);
  }

  let result: Holiday[] = [];
  for (const oneYear of years) {
    const oneYearResult = await prisma.holiday.findMany({
      where: {
        start: {
          gte: `${oneYear}-01-01`,
          lte: `${oneYear}-12-31`,
        },
      },
    });
    result = [...result, ...oneYearResult];
  }

  return NextResponse.json({ value: result });

}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<HolidayQueryResult | ErrorDto>> {
  try {
    return await doGET(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPOST(request: NextRequest) {
  await allowOnlyAdmins(request);

  const body = await request.json();
  const createInput: Prisma.HolidayCreateInput =
    Prisma.validator<Prisma.HolidayCreateInput>()(body);

  const holiday = await prisma.holiday.create({ data: createInput });

  return NextResponse.json(holiday, { status: 201 });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<Holiday | ErrorDto>> {
  try {
    return await doPOST(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
