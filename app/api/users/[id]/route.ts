import {
  ApiErrorNotFound,
  allowOnlyAdmins,
  handleTopLevelCatch, validateOrThrow, allowAdminOrSelf,
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
import { UserDto, UserCreateRequest, ErrorDto, UserPatchRequest } from '@/lib/dto';
import dayjs from 'dayjs';

async function doDELETE(request: NextRequest, id: string) {
  await allowOnlyAdmins(request);

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
    return await doDELETE(request, params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doHEAD(request: NextRequest, params: { id: string }) {
  const user = await prisma.userInDb.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!user) {
    throw new ApiErrorNotFound();
  }
  return NextResponse.json({ id: params.id }, { status: 200 });
}

// We do a HEAD request to checks if a user exists in the database
export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await doHEAD(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPUT(nextRequest: NextRequest, params: { id: string }): Promise<NextResponse<UserDto>> {
  // CreateRequest is fine. It contains all required fields
  const request = await validateOrThrow<UserCreateRequest>(
    new UserCreateRequest(await nextRequest.json()),
  );

  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
  });

  await updateCognitoUser(client, params.id, request.email, request.name, request.groups);

  // TODO - Find out why we need an upsert here.
  const dbResult = await prisma.userInDb.upsert({
    where: { id: params.id },
    update: {
      iban: request.iban,
      name: request.name,
      compensationGroups: request.compensationGroups,
    },
    create: {
      id: params.id,
      iban: request.iban,
      name: request.name,
      compensationGroups: request.compensationGroups,
    },
  });
  return NextResponse.json({ ...dbResult, groups: request.groups, email: request.email,
    termsAcceptedAt: dbResult.termsAcceptedAt?.toLocaleDateString() ?? null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await allowOnlyAdmins(request);

    return await doPUT(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function selectOneUser(id: string): Promise<UserDto> {
  const dbUser = await prisma.userInDb.findUnique({
    where: {id}
  });
  if (dbUser === null) {
    throw new ApiErrorNotFound(`User with id ${id} not found`);
  }

  const client = createCognitoClient();
  const cognitoUser = await getCognitoUserById(client, id);

  if (!cognitoUser) {
    throw new ApiErrorNotFound(`User ${id} does not exist in cognito`)
  }

  const groups = await listGroupsForUser(client, id);

  return {...dbUser,
    email: cognitoUser.email,
    groups: groups,
    termsAcceptedAt: dbUser.termsAcceptedAt?.toLocaleDateString() ?? null,
  }!;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<UserDto|ErrorDto>> {
  try {
    await allowAdminOrSelf(request, params.id);
    const user = await selectOneUser(params.id);
    return NextResponse.json(user);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function patchOneUser(id: string, payload: any) {
  const dbUser = await prisma.userInDb.findUnique({
    where: {id}
  });
  if (dbUser === null) {
    throw new ApiErrorNotFound(`User with id ${id} not found`);
  }
  const request = await validateOrThrow(new UserPatchRequest(payload));

  let data: any  = {};
  if (request.iban) {
    data['iban'] = request.iban;
  }
  if (request.termsAcceptedVersion) {
    data['termsAcceptedVersion'] = request.termsAcceptedVersion;
    data['termsAcceptedAt'] = new Date();
  }

  return prisma.userInDb.update({
    where: { id },
    data
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<UserDto|ErrorDto>> {
  try {
    await allowAdminOrSelf(request, params.id);
    await patchOneUser(params.id, await request.json());
    const result = await selectOneUser(params.id);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}