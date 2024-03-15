import { Test, TestingModule } from '@nestjs/testing';

import { AppUsersService } from './app-users.service';
import { InternalServerErrorException } from '@nestjs/common';
import { AppackGraphQlClient } from './AppackGraphQlClient';

describe('AppUsersService', () => {
  let service: AppUsersService;
  let client: jest.Mocked<AppackGraphQlClient>;

  beforeEach(async () => {
    client = { findOneUserProfile: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: AppackGraphQlClient,
          useValue: client,
        },
        AppUsersService,
      ],
    }).compile();

    service = module.get(AppUsersService);
  });

  test('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('returns null when profile cannot be found', async () => {
    const errorObject = JSON.parse(`
    {
        "response": {
          "errors": [
            {
              "message": "Cannot invoke \\"de.appack.api.profile.UserProfile.getAppId()\\" because \\"profile\\" is null",
              "locations": [{ "line": 3, "column": 13 }],
              "path": ["findOneUserProfile"],
              "extensions": { "classification": "INTERNAL_ERROR" }
            }
          ],
          "data": { "findOneUserProfile": null },
          "status": 200,
          "headers": {}
        },
        "request": {
          "query": "{findOneUserProfile(profileId: \\"undefined\\"){firstname,name,membershipNumber}}"
        }
      }
      `);

    client.findOneUserProfile = jest.fn(() => {
      throw errorObject;
    }) as any;

    const sut = new AppUsersService(client as any as AppackGraphQlClient);

    // WHEN
    const result = await sut.queryMemberById('any-id');
    // THEN
    expect(result).toBeNull();
  });

  test('returns 500 when API cannot be called.', async () => {
    const errorObject = JSON.parse(
      '{"response":{"error":"","status":401,"headers":{}},"request":{"query":"{findOneUserProfile(profileId: \\"64d13361e4b090e293e892da\\") {firstname,name,membershipNumber}}"}}',
    );

    client.findOneUserProfile = jest.fn(() => {
      throw errorObject;
    }) as any;

    const sut = new AppUsersService(client as any as AppackGraphQlClient);

    // WHEN THEN
    expect(async () => await sut.queryMemberById('any-id')).toThrow(
      InternalServerErrorException,
    );
  });

  test('returns profile on success', async () => {
    const validResponse = {
      findOneUserProfile: {
        firstname: 'Tobias',
        name: 'Lippert',
        membershipNumber: '30.2018.6695',
      },
    };

    client.findOneUserProfile = jest.fn(() => validResponse) as any;

    const sut = new AppUsersService(client as any as AppackGraphQlClient);

    // WHEN
    const result = await sut.queryMemberById('any-id');
    // THEN
    expect(result.firstname).toBe('Tobias');
    expect(result.name).toBe('Lippert');
    expect(result.membershipNumber).toBe('30.2018.6695');
  });
});
