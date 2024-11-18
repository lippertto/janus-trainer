import {
  allowAdminOrSelf,
  allowOnlyAdmins,
  handleTopLevelCatch,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { disableCognitoUser, updateCognitoUser } from '../cognito';
import {
  ErrorDto,
  UserCreateRequest,
  UserDto,
  UserPatchRequest,
  UserUpdateRequest,
} from '@/lib/dto';
import { patchOneUser } from '@/app/api/users/[userId]/patch';
import { cognitoClient } from '@/app/api/users/cognito-client';
import { logger } from '@/lib/logging';
import { selectOneUser } from '@/app/api/users/[userId]/select-one-user';

async function doDELETE(id: string) {
  const dbUser = await prisma.userInDb.findFirst({ where: { id } });
  if (!dbUser || dbUser.deletedAt) {
    logger.info(
      `User with ${id} not found or soft-deleted. Will not delete it.`,
    );
    return new Response(null, { status: 204 });
  }

  await disableCognitoUser(cognitoClient(), id);

  await prisma.userInDb.update({
    where: { id, deletedAt: null },
    data: {
      deletedAt: new Date(),
    },
  });
  return new Response(null, { status: 204 });
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> },
) {
  const params = await props.params;
  try {
    await allowOnlyAdmins(request);
    return await doDELETE(params.userId);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

// We do a HEAD request to checks if a user exists in the database
export async function HEAD(
  _nextRequest: NextRequest,
  props: { params: Promise<{ userId: string }> },
) {
  const params = await props.params;
  try {
    const user = await prisma.userInDb.findFirst({
      where: { id: params.userId, deletedAt: null },
    });
    if (!user) return notFoundResponse();
    return NextResponse.json({ id: params.userId }, { status: 200 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPUT(
  request: UserUpdateRequest,
  params: { userId: string },
): Promise<UserDto> {
  await updateCognitoUser(
    cognitoClient(),
    params.userId,
    request.email,
    request.name,
    request.groups,
  );

  const dbResult = await prisma.userInDb.update({
    where: { id: params.userId },
    data: {
      name: request.name,
      iban: request.iban,
      email: request.email,
      compensationClasses: {
        set: request.compensationClassIds.map((ccId) => ({ id: ccId })),
      },
    },
    include: {
      compensationClasses: true,
    },
  });
  return {
    ...dbResult,
    groups: request.groups,
    email: request.email,
    termsAcceptedAt: dbResult.termsAcceptedAt?.toLocaleDateString() ?? null,
    compensationClasses: dbResult.compensationClasses.map((cc) => ({
      ...cc,
      compensationValues: [],
    })),
  };
}

export async function PUT(
  nextRequest: NextRequest,
  props: { params: Promise<{ userId: string }> },
): Promise<NextResponse<UserDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(
      UserCreateRequest,
      await nextRequest.json(),
    );

    const updated = await doPUT(request, params);
    return NextResponse.json(updated);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> },
): Promise<NextResponse<UserDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowAdminOrSelf(request, params.userId);

    const expandParameters = (
      request.nextUrl.searchParams.get('expand') ?? ''
    ).split(',');
    let includeCognitoProperties = expandParameters.indexOf('cognito') !== -1;
    let includeCompensationClasses =
      expandParameters.indexOf('compensationClasses') !== -1;
    let includeCompensationValues =
      expandParameters.indexOf('compensationValues') !== -1;

    const user = await selectOneUser(
      params.userId,
      includeCognitoProperties,
      includeCompensationValues,
      includeCompensationClasses,
    );
    return NextResponse.json(user);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

/** Patch a user. This is intended to be used from the profile page. */
export async function PATCH(
  nextRequest: NextRequest,
  props: { params: Promise<{ userId: string }> },
): Promise<NextResponse<UserDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowAdminOrSelf(nextRequest, params.userId);
    const request = await validateOrThrow(
      UserPatchRequest,
      await nextRequest.json(),
    );
    await patchOneUser(params.userId, request);
    const result = await selectOneUser(params.userId, true, false, false);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
