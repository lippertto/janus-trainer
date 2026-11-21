import { describe, expect, test } from 'vitest';
import {
  ApiErrorTooManyRequests,
  ApiErrorUnauthorized,
} from '@/lib/helpers-for-api';

describe('ApiErrorUnauthorized', () => {
  test('responds with 401 and code Unauthorized', async () => {
    const response = new ApiErrorUnauthorized('Token is missing').toResponse();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { message: 'Token is missing', code: 'Unauthorized' },
    });
  });
});

describe('ApiErrorTooManyRequests', () => {
  test('responds with 429 and code TooManyRequests', async () => {
    const response = new ApiErrorTooManyRequests(
      'Zu viele Versuche',
    ).toResponse();
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: { message: 'Zu viele Versuche', code: 'TooManyRequests' },
    });
  });

  test('is an Error', () => {
    expect(new ApiErrorTooManyRequests('x')).toBeInstanceOf(Error);
  });
});
