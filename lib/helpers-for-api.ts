import { NextRequest, NextResponse } from 'next/server';
import { ErrorDto } from './dto';
import { getToken, JWT } from 'next-auth/jwt';
import { validate, ValidationError } from 'class-validator';
import { logger } from '@/lib/logging';

/** Will throw if the token does not have the admin role. */
export async function allowOnlyAdmins(req: NextRequest) {
  if (process.env.DISABLE_JWT_CHECKS) return;

  const token = await getToken({ req });
  if (!token) throw new ApiErrorUnauthorized('Token is missing');

  const groups = token.groups as string[];
  if (groups === undefined) {
    throw new ApiErrorBadRequest('Groups field is missing in JWT');
  }
  if (groups.findIndex((e) => e === 'admins') === -1) {
    throw new ApiErrorForbidden('Must be admin to perform this action');
  }
}

export async function allowNoOne(_: NextRequest) {
  if (process.env.DISABLE_JWT_CHECKS) return;
  throw new ApiErrorForbidden('This operation is allowed only in tests');
}

export async function isAdmin(
  request: NextRequest,
  jwt: JWT | null = null,
): Promise<boolean> {
  if (process.env.DISABLE_JWT_CHECKS) return true;

  if (!jwt) {
    jwt = await getToken({ req: request });
  }
  if (!jwt) {
    throw new ApiErrorInternalServerError('Could not obtain jwt token');
  }
  const groups = jwt.groups as string[];
  if (groups === undefined) {
    throw new ApiErrorBadRequest('Groups field is missing in JWT');
  }
  if (groups.findIndex((e) => e === 'admins') !== -1) {
    return true;
  }
  return false;
}

/**
 * Throws an exception, unless: the request belongs to an admin user, or the 'sub' of the token is the same as
 * 'ownUserId'
 */
export async function allowAdminOrSelf(
  req: NextRequest,
  ownUserId: string,
): Promise<void> {
  if (process.env.DISABLE_JWT_CHECKS) return;
  const token = await getToken({ req });
  if (!token) throw new ApiErrorUnauthorized('Token is missing');
  if (await isAdmin(req, token)) return;

  if (token.sub === ownUserId) {
    return;
  }

  throw new ApiErrorForbidden(
    "You are trying to change other people's data. You must be admin to do that",
  );
}

export async function getOwnUserId(req: NextRequest): Promise<string> {
  if (process.env.DISABLE_JWT_CHECKS)
    return '502c79bc-e051-70f5-048c-5619e49e2383';
  const token = await getToken({ req });
  if (!token) throw new ApiErrorUnauthorized('Token is missing');
  return token.sub!;
}

/** Will throw if the token is not valid. */
export async function allowAnyLoggedIn(req: NextRequest): Promise<void> {
  if (process.env.DISABLE_JWT_CHECKS) return;
  const token = await getToken({ req });
  if (!token) throw new ApiErrorUnauthorized('Token is missing');
}

export function badRequestResponse(message: string): NextResponse<ErrorDto> {
  return errorResponse(message, 400);
}

export function forbiddenResponse(message: string): NextResponse<ErrorDto> {
  return errorResponse(message, 403);
}

export function notAcceptableResponse(message: string): NextResponse<ErrorDto> {
  return errorResponse(message, 406);
}

/** A response for DELETE functions. */
export function emptyResponse(): Response {
  return new Response(null, { status: 204 });
}

export function notFoundResponse(): NextResponse<ErrorDto> {
  const error: ErrorDto = { error: { message: 'not found', code: 'NotFound' } };
  return NextResponse.json(error, { status: 404 });
}

export function errorResponse(
  message: string,
  status: number,
  code: string | undefined = undefined,
): NextResponse<ErrorDto> {
  return NextResponse.json(
    { error: { message, code: code ?? 'UnexpectedError' } },
    { status },
  );
}

export function internalServerErrorResponse(
  message: string | undefined = undefined,
) {
  return errorResponse(
    message ?? 'internal server error',
    500,
    'InternalServerError',
  );
}

export class ApiError extends Error {
  private httpCode: number;
  private errorCode: string;

  constructor(message: string, errorCode: string, httpCode: number) {
    super(message);
    // recommendation for typescript from
    // https://github.com/microsoft/TypeScript-wiki/blob/81fe7b91664de43c02ea209492ec1cea7f3661d0/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, ApiError.prototype);
    this.httpCode = httpCode;
    this.errorCode = errorCode;
  }

  toResponse(): NextResponse<ErrorDto> {
    return NextResponse.json(
      { error: { message: this.message, code: this.errorCode } },
      { status: this.httpCode },
    );
  }
}

export class ApiConflictError extends ApiError {
  constructor(message: string, errorCode: string) {
    super(message, errorCode, 409);
    Object.setPrototypeOf(this, ApiConflictError.prototype);
  }
}

export class ApiErrorInternalServerError extends ApiError {
  constructor(message: string) {
    super(message, 'InternalServerError', 500);
    Object.setPrototypeOf(this, ApiErrorInternalServerError.prototype);
  }
}

export class ApiErrorForbidden extends ApiError {
  constructor(message: string) {
    super(message, 'Forbidden', 403);
    Object.setPrototypeOf(this, ApiErrorForbidden.prototype);
  }
}

export class ApiErrorUnauthorized extends ApiError {
  constructor(message: string) {
    super(message, 'Unauthorized', 403);
    Object.setPrototypeOf(this, ApiErrorUnauthorized.prototype);
  }
}

export class ApiErrorBadRequest extends ApiError {
  constructor(message: string) {
    super(message, 'BadRequest', 400);
    Object.setPrototypeOf(this, ApiErrorBadRequest.prototype);
  }
}

export class ApiErrorNotFound extends ApiError {
  constructor(message: string | undefined = undefined) {
    super(message ?? '', 'NotFound', 404);
    Object.setPrototypeOf(this, ApiErrorNotFound.prototype);
  }
}

export class ApiErrorConflict extends ApiError {
  constructor(
    message: string | undefined = undefined,
    errorCode: string | undefined = undefined,
  ) {
    super(message ?? '', errorCode ?? 'Conflict', 409);
    Object.setPrototypeOf(this, ApiErrorConflict.prototype);
  }
}

export function handleTopLevelCatch(e: any): NextResponse<ErrorDto> {
  if (e instanceof ApiError) {
    logger.info(`Exception: ${e.message})`);
    return e.toResponse();
  }
  if (e instanceof Error) {
    logger.info(e);
    return internalServerErrorResponse(e.message);
  }

  return internalServerErrorResponse();
}

function validationErrorToMessage(error: ValidationError): string {
  let result = '';
  // result += error.property
  let constraints = error.constraints;
  if (typeof constraints === 'object') {
    result += Object.keys(constraints)
      .map((constraint) => constraints[constraint])
      .join(', ');
  }
  return result;
}

/** @deprecated Use validateOrThrow instead. */
export async function validateOrThrowOld<T extends object>(arg: T): Promise<T> {
  const validationErrors = await validate(arg);
  if (validationErrors.length !== 0) {
    const validationMessage = validationErrors
      .map(validationErrorToMessage)
      .join('; ');
    throw new ApiErrorBadRequest('Request is invalid: ' + validationMessage);
  }
  return arg;
}

export async function validateOrThrow<T extends object>(
  type: { new (args: any): T },
  data: any,
): Promise<T> {
  const validationErrors = await validate(new type(data));

  if (validationErrors.length !== 0) {
    const validationMessage = validationErrors
      .map(validationErrorToMessage)
      .join('; ');
    throw new ApiErrorBadRequest('Request is invalid: ' + validationMessage);
  }
  return data as T;
}

export function idAsNumberOrThrow(id: string | number) {
  if (typeof id === 'number') return id;
  const result = parseInt(id);
  if (!result) {
    throw new ApiErrorBadRequest(
      `Provided id '${id}' does not seem to be a number`,
    );
  }
  return result;
}
