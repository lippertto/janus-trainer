import {
  allowAdminOrSelf,
  allowOnlyAdmins,
  ApiErrorNotFound,
  handleTopLevelCatch,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { NextRequest, NextResponse } from 'next/server';
import {
  disableCognitoUser,
  getCognitoUserById,
  listGroupsForUser,
  updateCognitoUser,
} from '../cognito';
import {
  ErrorDto,
  Group,
  UserCreateRequest,
  UserDto,
  UserPatchRequest,
  UserUpdateRequest,
} from '@/lib/dto';
import { patchOneUser } from '@/app/api/users/[userId]/patch';
import {
  cognitoClient,
  createCognitoClient,
} from '@/app/api/users/cognito-client';
import { logger } from '@/lib/logging';

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
  { params }: { params: { userId: string } },
) {
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
  { params }: { params: { userId: string } },
) {
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
  { params }: { params: { userId: string } },
): Promise<NextResponse<UserDto | ErrorDto>> {
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

async function selectOneUser(
  id: string,
  includeCognitoProperties: boolean,
  includeCompensationValues: boolean,
  includeCompensationClasses: boolean,
): Promise<UserDto> {
  let expand;
  if (includeCompensationClasses) {
    expand = { compensationClasses: true };
  }
  // it's fine if we overwrite this
  if (includeCompensationValues) {
    expand = { compensationClasses: { include: { compensationValues: true } } };
  }

  const dbUser = await prisma.userInDb.findUnique({
    where: { id },
    include: expand,
  });
  if (dbUser === null) {
    throw new ApiErrorNotFound(`User with id ${id} not found`);
  }

  const client = createCognitoClient();

  let email: string = '';
  let groups: Group[] = [];
  if (includeCognitoProperties) {
    const cognitoUser = await getCognitoUserById(client, id);

    if (!cognitoUser) {
      throw new ApiErrorNotFound(`User ${id} does not exist in cognito`);
    }

    email = cognitoUser.email;
    groups = await listGroupsForUser(client, id);
  }

  return {
    ...dbUser,
    email: email,
    groups: groups,
    termsAcceptedAt: dbUser.termsAcceptedAt?.toLocaleDateString() ?? null,
    // @ts-ignore
    compensationClasses: dbUser.compensationClasses ?? [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
): Promise<NextResponse<UserDto | ErrorDto>> {
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
  { params }: { params: { userId: string } },
): Promise<NextResponse<UserDto | ErrorDto>> {
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
