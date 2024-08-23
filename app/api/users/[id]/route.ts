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
  createCognitoClient,
  disableCognitoUser,
  getCognitoUserById,
  listGroupsForUser,
  updateCognitoUser,
} from '../cognito';
import { ErrorDto, Group, UserCreateRequest, UserDto, UserPatchRequest, UserUpdateRequest } from '@/lib/dto';
import { patchOneUser } from '@/app/api/users/[id]/patch';

async function doDELETE(id: string) {
  const dbUser = await prisma.userInDb.findFirst({ where: { id } });
  if (!dbUser || dbUser.deletedAt) {
    console.log(`User with ${id} not found or soft-deleted. Will not delete it.`);
    return new Response(null, { status: 204 });
  }

  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
  });
  await disableCognitoUser(client, id);

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
  { params }: { params: { id: string } },
) {
  try {
    await allowOnlyAdmins(request);
    return await doDELETE(params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

// We do a HEAD request to checks if a user exists in the database
export async function HEAD(
  _nextRequest: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await prisma.userInDb.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!user) return notFoundResponse()
    return NextResponse.json({ id: params.id }, { status: 200 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPUT(request: UserUpdateRequest, params: { id: string }): Promise<UserDto> {

  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
  });

  await updateCognitoUser(client, params.id, request.email, request.name, request.groups);

  const dbResult = await prisma.userInDb.update({
    where: { id: params.id },
    data: {
      name: request.name,
      iban: request.iban,
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
    groups: request.groups, email: request.email,
    termsAcceptedAt: dbResult.termsAcceptedAt?.toLocaleDateString() ?? null,
    compensationClasses: dbResult.compensationClasses.map((cc) => ({ ...cc, compensationValues: [] })),
  };
}

export async function PUT(
  nextRequest: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<UserDto|ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(UserCreateRequest, await nextRequest.json());

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

  const dbUser= await prisma.userInDb.findUnique({
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
  { params }: { params: { id: string } },
): Promise<NextResponse<UserDto | ErrorDto>> {
  try {
    await allowAdminOrSelf(request, params.id);

    const expandParameters = (request.nextUrl.searchParams.get('expand') ?? '').split(',');
    let includeCognitoProperties = (expandParameters.indexOf('cognito') !== -1);
    let includeCompensationClasses = (expandParameters.indexOf('compensationClasses') !== -1);
    let includeCompensationValues = (expandParameters.indexOf('compensationValues') !== -1);

    const user = await selectOneUser(params.id, includeCognitoProperties, includeCompensationValues, includeCompensationClasses);
    return NextResponse.json(user);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

/** Patch a user. This is intended to be used from the profile page. */
export async function PATCH(
  nextRequest: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<UserDto | ErrorDto>> {
  try {
    await allowAdminOrSelf(nextRequest, params.id);
    const request = await validateOrThrow(UserPatchRequest, await nextRequest.json());
    await patchOneUser(params.id, request);
    const result = await selectOneUser(params.id, true, false, false);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}