import {
  ApiErrorNotFound,
  allowOnlyAdmins,
  handleTopLevelCatch, validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { NextRequest, NextResponse } from 'next/server';
import { disableCognitoUser, updateCognitoUser } from '../cognito';
import { User, UserCreateRequest } from '@/lib/dto';

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

async function doPUT(nextRequest: NextRequest, params: { id: string }): Promise<NextResponse<User>> {
  await allowOnlyAdmins(nextRequest);
  // CreateRequest is fine. It contains all required fields
  const request = await validateOrThrow<UserCreateRequest>(
    new UserCreateRequest(await nextRequest.json()),
  );

  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION,
  });

  await updateCognitoUser(client, params.id, request.email, request.name, request.groups);

  const dbResult = await prisma.userInDb.upsert({
    where: { id: params.id },
    update: {
      iban: request.iban,
      name: request.name,
    },
    create: {
      id: params.id,
      iban: request.iban,
      name: request.name,
    },
  });
  return NextResponse.json({ ...dbResult, groups: request.groups, email: request.email });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    console.log(`Updating user ${params.id}`);
    return await doPUT(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
