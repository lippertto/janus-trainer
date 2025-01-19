import { describe, expect, test } from 'vitest';
import { UserCreateRequest } from '@/lib/dto';
import { ApiErrorBadRequest } from '@/lib/helpers-for-api';
import { createUser } from '@/app/api/users/createUser';

describe('createUser', () => {
  test('rejects names with zwsp', async () => {
    const request: UserCreateRequest = {
      name: 'Luca ​Leppert',
      email: 'luca@aol.com',
      groups: [],
      compensationClassIds: [],
      iban: undefined,
    };

    expect(async () => {
      await createUser(request);
    }).rejects.toThrow(ApiErrorBadRequest);
  });
});
