import {
  ErrorDto,
  UserCreateRequest,
  UserDto,
  UserQueryResponseDto,
} from '@/lib/dto';
import {
  allowOnlyAdmins,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';

import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/app/api/users/createUser';
import { listUsers } from '@/app/api/users/listUsers';

export async function GET(
  request: NextRequest,
): Promise<NextResponse<UserQueryResponseDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);

    const value = await listUsers(request);

    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<UserDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(
      UserCreateRequest,
      await nextRequest.json(),
    );
    return NextResponse.json(await createUser(request), { status: 201 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
