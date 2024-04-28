import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponse } from './dto';
import { getToken } from 'next-auth/jwt';
import { validate } from 'class-validator';

export async function allowOnlyAdmins(req: NextRequest) {
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

export async function allowAdminOrSelf(
  req: NextRequest,
  ownUserId: string,
): Promise<void> {
  const token = await getToken({ req });
  if (!token) throw new ApiErrorUnauthorized('Token is missing');

  const groups = token.groups as string[];
  if (groups === undefined) {
    throw new ApiErrorBadRequest('Groups field is missing in JWT');
  }
  if (groups.findIndex((e) => e === 'admins') !== -1) {
    return;
  }
  if (token.sub === ownUserId) {
    return;
  }

  throw new ApiErrorForbidden(
    "You are trying to change other people's data. You must be admin to do that",
  );
}

export async function allowAnyAuthorized(
  req: NextRequest,
): Promise<NextResponse<ErrorResponse> | null> {
  const token = await getToken({ req });
  if (!token) return errorResponse('Unauthorized', 401);
  return null;
}

export function badRequestResponse(
  message: string,
): NextResponse<ErrorResponse> {
  return errorResponse(message, 400);
}

/** A response for DELETE functions. */
export function emptyResponse(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(
  message: string,
  status: number,
  code: string | undefined = undefined,
): NextResponse<ErrorResponse> {
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

  toResponse(): NextResponse<ErrorResponse> {
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

export function handleTopLevelCatch(e: any): NextResponse<ErrorResponse> {
  if (e instanceof ApiError) {
    return e.toResponse();
  }
  if (e instanceof Error) {
    return internalServerErrorResponse(e.message);
  }

  return internalServerErrorResponse();
}

export async function validateOrThrow<T extends object>(arg: T): Promise<T> {
  const validationErrors = await validate(arg);
  if (validationErrors.length !== 0) {
    throw new ApiErrorBadRequest(
      'Request is invalid: ' + JSON.stringify(validationErrors),
    );
  }
  return arg;
}
