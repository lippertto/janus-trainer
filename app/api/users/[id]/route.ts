import {
  allowAdminOrSelf,
  allowOnlyAdmins,
  ApiErrorNotFound,
  handleTopLevelCatch,
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
import { ErrorDto, Group, UserCreateRequest, UserDto } from '@/lib/dto';
import { patchOneUser } from '@/app/api/users/[id]/patch';

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

async function selectOneUser(id: string, includeCognitoProperties: boolean): Promise<UserDto> {
  const dbUser = await prisma.userInDb.findUnique({
    where: {id}
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
      throw new ApiErrorNotFound(`User ${id} does not exist in cognito`)
    }

    email = cognitoUser.email;
    groups = await listGroupsForUser(client, id);
  }

  return {...dbUser,
    email: email,
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
    const includeCognitoProperties = request.nextUrl.searchParams.get('includeCognitoProperties') === 'true';


    const user = await selectOneUser(params.id, includeCognitoProperties    );
    return NextResponse.json(user);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<UserDto|ErrorDto>> {
  try {
    await allowAdminOrSelf(request, params.id);
    await patchOneUser(params.id, await request.json());
    const result = await selectOneUser(params.id, true);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}