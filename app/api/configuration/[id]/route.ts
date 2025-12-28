import { NextRequest, NextResponse } from 'next/server';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorBadRequest,
  ApiErrorNotFound,
  badRequestResponse,
  getOwnUserId,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import {
  ConfigurationValueDto,
  ConfigurationValueUpdateRequest,
  ErrorDto,
} from '@/lib/dto';
import {
  ConfigKey,
  defaultValueFor,
  isValidValueFor,
} from '@/app/api/configuration/configuration';
import { logger } from '@/lib/logging';

function ensureValidKey(key: string): ConfigKey {
  if (!Object.values(ConfigKey).includes(key as ConfigKey)) {
    throw new ApiErrorNotFound(
      `Could not find configuration value with key ${key}`,
    );
  }
  return key as ConfigKey;
}

async function updateConfigurationValue(
  key: ConfigKey,
  userId: string,
  request: ConfigurationValueUpdateRequest,
) {
  return prisma.appConfig.upsert({
    where: { key },
    update: {
      key: key,
      value: request.value,
      updatedAt: new Date(),
      updatedById: userId,
    },
    create: {
      key: key,
      value: request.value,
      updatedAt: new Date(),
      updatedById: userId,
    },
  });
}

export async function PUT(
  nextRequest: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse<ConfigurationValueDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const userId = await getOwnUserId(nextRequest);
    const configKey = ensureValidKey(params.id);

    const request = await validateOrThrow(
      ConfigurationValueUpdateRequest,
      await nextRequest.json(),
    );

    if (!isValidValueFor(configKey, request.value)) {
      return badRequestResponse(
        `${request.value} is not a valid value for ${configKey}`,
      );
    }

    const result = await updateConfigurationValue(configKey, userId, request);

    logger.info(
      { userId },
      `User ${userId} updated configuration value ${params.id} to ${request.value}`,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function getConfigurationValue(key: ConfigKey): Promise<string> {
  const queryResult = await prisma.appConfig.findUnique({ where: { key } });
  if (!queryResult) {
    return defaultValueFor(key);
  } else {
    return queryResult.value;
  }
}

export async function GET(
  nextRequest: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse<ConfigurationValueDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowAnyLoggedIn(nextRequest);
    const configKey = ensureValidKey(params.id);
    const configValue = await getConfigurationValue(configKey);

    return NextResponse.json(
      { key: configKey, value: configValue },
      { status: 200 },
    );
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function DELETE(
  nextRequest: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const configKey = ensureValidKey(params.id);
    await prisma.appConfig.delete({ where: { key: configKey } });

    return new Response(null, { status: 204 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
