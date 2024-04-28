import prisma from '@/lib/prisma';
import {
  allowOnlyAdmins,
  errorResponse,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import { NextRequest, NextResponse } from 'next/server';

async function doGET(request: NextRequest) {
  await allowOnlyAdmins(request);
  if (process.env.NODE_ENV === 'production') {
    return errorResponse('Databases cannot be cleaned on production', 405);
  }

  await prisma.holiday.deleteMany({ where: {} });
  await prisma.training.deleteMany({ where: {} });
  return NextResponse.json({ message: 'ok' });
}

export async function GET(request: NextRequest) {
  try {
    return await doGET(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
