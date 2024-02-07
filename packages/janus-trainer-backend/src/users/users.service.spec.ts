import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Group } from 'janus-trainer-dto';
import { UsersService } from './users.service';
import {
  type UserType,
  type CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

describe('Users service', () => {
  test('Parses Cognito user list response', () => {
    const cognitoResponse = {
      PaginationToken: 'efgh5678EXAMPLE',
      Users: [
        {
          Attributes: [
            {
              Name: 'sub',
              Value: 'eaad0219-2117-439f-8d46-4db20e59268f',
            },
            {
              Name: 'email',
              Value: 'testuser@example.com',
            },
            {
              Name: 'name',
              Value: 'Test User',
            },
          ],
          Enabled: true,
          UserCreateDate: 1682955829.578,
          UserLastModifiedDate: 1689030181.63,
          UserStatus: 'CONFIRMED',
          Username: 'testuser',
        },
        {
          Attributes: [
            {
              Name: 'sub',
              Value: '3b994cfd-0b07-4581-be46-3c82f9a70c90',
            },
            {
              Name: 'email',
              Value: 'testuser2@example.com',
            },
          ],
          Enabled: true,
          UserCreateDate: 1684427979.201,
          UserLastModifiedDate: 1684427979.201,
          UserStatus: 'UNCONFIRMED',
          Username: 'testuser2',
        },
        {
          Attributes: [
            {
              Name: 'sub',
              Value: '5929e0d1-4c34-42d1-9b79-a5ecacfe66f7',
            },
            {
              Name: 'email',
              Value: 'testuser3@example.com',
            },
          ],
          Enabled: true,
          UserCreateDate: 1684427823.641,
          UserLastModifiedDate: 1684427823.641,
          UserStatus: 'UNCONFIRMED',
          Username: 'testuser3@example.com',
        },
      ],
    };

    const sut = new UsersService(jest.fn() as unknown as Repository<User>);

    // WHEN
    const user = sut.convertOneCognitoUser(
      cognitoResponse.Users[0] as any as UserType,
    );

    // THEN
    expect(user.email).toBe('testuser@example.com');
  });

  test('assigns groups as expected', async () => {
    const client: { send: jest.Mock } = {
      send: jest.fn(),
    };
    const sut = new UsersService(jest.fn() as unknown as Repository<User>);

    // WHEN
    await sut.ensureGroups(
      client as any as CognitoIdentityProviderClient,
      'username',
      [Group.ADMINS],
    );

    // THEN
    expect(client.send).toHaveBeenCalledTimes(2);
    const firstParameterClass = client.send.mock.calls[0][0].constructor.name;
    const secondParameterClass = client.send.mock.calls[1][0].constructor.name;

    expect([firstParameterClass, secondParameterClass]).toContain(
      'AdminRemoveUserFromGroupCommand',
    );
    expect([firstParameterClass, secondParameterClass]).toContain(
      'AdminAddUserToGroupCommand',
    );
  });
});
