import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ConfigurationValueListResponse, ErrorDto } from '@/lib/dto';
import { allowAnyLoggedIn, handleTopLevelCatch } from '@/lib/helpers-for-api';
import { ConfigKey, defaultValueFor } from './configuration';

async function getAllConfigurationValues() {
  const result: { key: string; value: string }[] = [];
  const allEntries = await prisma.appConfig.findMany();
  Object.entries(ConfigKey).forEach(([enumKey, enumValue]) => {
    const thisEntry = allEntries.find((c) => c.key === enumValue);
    if (thisEntry) {
      result.push({
        key: enumValue,
        value: thisEntry.value,
      });
    } else {
      result.push({
        key: enumValue,
        value: defaultValueFor(enumValue),
      });
    }
  });
  return result;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ConfigurationValueListResponse | ErrorDto>> {
  try {
    await allowAnyLoggedIn(request);
    const result = await getAllConfigurationValues();
    return NextResponse.json({ value: result });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
