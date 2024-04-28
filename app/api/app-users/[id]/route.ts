import {
  ApiErrorInternalServerError,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import { NextRequest, NextResponse } from 'next/server';
import { appackClient } from './AppackGraphQlClient';
import { ClientError } from 'graphql-request';
import { AppUser } from '@/lib/dto';

async function doGET(
  request: NextRequest,
  params: { id: string },
): Promise<Response> {
  try {
    const userProfile = await appackClient.findOneUserProfile(params.id);
    return NextResponse.json(userProfile as AppUser);
  } catch (e) {
    if (e instanceof ClientError) {
      const message: string | null =
        e?.response?.errors?.at(0)?.message ??
        (e?.response?.error as string | null);
      const status: number | null =
        // @ts-expect-error The error type is not properly documented. This has been retro-engineered.
        e?.response?.errors?.at(0)?.status ?? e?.response?.status;

      if (message && message.includes('"profile" is null')) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
      } else if (status === 401) {
        throw new ApiErrorInternalServerError(
          'Permission denied to Appack API',
        );
      } else {
        throw new ApiErrorInternalServerError(
          `Error while talking to the Appack API: ${e?.message}`,
        );
      }
    }
    throw e;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    return await doGET(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
