import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserDto, Group } from 'janus-trainer-dto';
import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminCreateUserResponse,
  AdminGetUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand,
  AttributeType,
  CognitoIdentityProviderClient,
  ListGroupsCommand,
  ListGroupsResponse,
  ListUsersCommand,
  ListUsersInGroupCommand,
  UserType,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

const USER_POOL_ID = 'eu-north-1_NtmiRBAZH';

interface ParsedCognitoUser {
  username: string;
  email: string;
  groups: Group[];
  name: string;
}

function getCognitoAttributeOrThrow(
  attributes: AttributeType[],
  name: string,
  username,
) {
  const matchingAttribute = attributes.find((a) => a.Name === name);
  if (!matchingAttribute) {
    throw new InternalServerErrorException(
      `Bad cognito user ${username}. Missing attribute '${name}'`,
    );
  }
  return matchingAttribute.Value;
}

/** Returns all users ids for the given group. */
async function findUsersForGroup(
  client: CognitoIdentityProviderClient,
  group: string,
): Promise<string[]> {
  const result: string[] = [];
  let nextToken = undefined;

  do {
    const response = await client.send(
      new ListUsersInGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: group,
        NextToken: nextToken,
      }),
    );
    result.push(...response.Users.map((user) => user.Username));
    nextToken = response.NextToken;
  } while (nextToken);

  return result;
}

@Injectable()
export class UsersService {
  private readonly log: Logger = new Logger();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /** Lists all users which are stored in cognito.  */
  async listUsers(): Promise<UserDto[]> {
    const client = new CognitoIdentityProviderClient({ region: 'eu-north-1' });

    const allUsers = new Map(
      (await this.listAllUsers(client)).map((user) => [user.username, user]),
    );
    this.log.debug(`Found ${allUsers.size} users in cognito.`);
    const allGroups = await this.listGroups(client);
    this.log.debug(`Found groups: ${JSON.stringify(allGroups)} in cognito`);

    for (let i = 0; i < allGroups.length; i++) {
      const thisGroup = allGroups[i];
      const usersInThisGroup = await findUsersForGroup(client, thisGroup);
      usersInThisGroup.forEach((user) => {
        allUsers.get(user).groups.push(thisGroup as Group);
      });
    }

    const result: UserDto[] = [];
    for (const [username, cognitoUser] of allUsers.entries()) {
      const userInDatabase = await this.userRepository.findOneBy({
        id: username,
      });
      const userResponse = {
        ...cognitoUser,
        id: username,
        iban: userInDatabase?.iban,
      };
      result.push(userResponse);
    }

    return result;
  }

  async listGroups(client: CognitoIdentityProviderClient): Promise<string[]> {
    let response: ListGroupsResponse;
    try {
      response = await client.send(
        new ListGroupsCommand({
          UserPoolId: USER_POOL_ID,
        }),
      );
    } catch (e) {
      throw new InternalServerErrorException('Failed to list cognito groups');
    }
    return response.Groups.map((it) => it.GroupName);
  }

  /** Create a new user in cognito and the database.
   *
   * Note: If `JEST_WORKER_ID` is set (i.e. in tests), this method will not interact with cognitos!
   */
  async createUser(
    name: string,
    email: string,
    groups: Group[],
    iban?: string,
  ): Promise<User> {
    if (process.env.JEST_WORKER_ID) {
      const username = uuidv4();
      const user = await this.userRepository.create({
        id: username,
        iban: iban,
        name: name,
      });
      return await this.userRepository.save(user);
    }

    const client = new CognitoIdentityProviderClient({ region: 'eu-north-1' });

    const createUserRequest = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [{ Name: 'name', Value: name }],
    });
    let createResponse;
    try {
      createResponse = (await client.send(
        createUserRequest,
      )) as AdminCreateUserResponse;
    } catch (e) {
      if (e instanceof UsernameExistsException) {
        this.log.error(
          `Could not create user. User with email ${email} already exists.`,
        );
        throw new ConflictException({
          error: {
            code: 'UsernameAlreadyExists',
            message: `User with email ${email} already exists`,
          },
        });
      }
      this.log.error(`Failed to create user: ${e.message}`);
      throw new InternalServerErrorException();
    }
    const username = createResponse.User.Username;

    groups.forEach(async (g) => {
      try {
        await client.send(
          new AdminAddUserToGroupCommand({
            UserPoolId: USER_POOL_ID,
            Username: username,
            GroupName: g,
          }),
        );
      } catch (e) {
        this.log.error(`Failed to add user ${username} to group ${g}`);
      }
    });

    return await this.userRepository.create({
      id: username,
      name: name,
      iban: iban,
    });
  }

  /** Returns all users in cognito. Note, the groups will be empty . */
  async listAllUsers(
    client: CognitoIdentityProviderClient,
  ): Promise<ParsedCognitoUser[]> {
    const result: ParsedCognitoUser[] = [];
    let paginationToken = undefined;
    do {
      const response = await client.send(
        new ListUsersCommand({
          UserPoolId: USER_POOL_ID,
          PaginationToken: paginationToken,
        }),
      );
      paginationToken = response.PaginationToken;
      result.push(...response.Users.map(this.convertOneCognitoUser, this));
    } while (paginationToken);

    return result;
  }

  convertOneCognitoUser(cognitoUser: UserType): ParsedCognitoUser {
    const email = getCognitoAttributeOrThrow(
      cognitoUser.Attributes,
      'email',
      cognitoUser.Username,
    );
    const name = getCognitoAttributeOrThrow(
      cognitoUser.Attributes,
      'name',
      cognitoUser.Username,
    );

    return {
      username: cognitoUser.Username,
      email: email,
      name: name,
      groups: [],
    };
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ id: id });
  }

  async updateUser(
    cognitoId: string,
    name: string,
    email: string,
    groups: Group[],
    iban?: string,
  ): Promise<UserDto> {
    const client = new CognitoIdentityProviderClient({ region: 'eu-north-1' });
    try {
      await client.send(
        new AdminGetUserCommand({
          Username: cognitoId,
          UserPoolId: USER_POOL_ID,
        }),
      );
    } catch (e) {
      throw new NotFoundException(
        `Could not update user because it does not exist in Cognito`,
      );
    }

    const attributes = [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ];

    await client.send(
      new AdminUpdateUserAttributesCommand({
        Username: cognitoId,
        UserPoolId: USER_POOL_ID,
        UserAttributes: attributes,
      }),
    );
    this.log.log(`Updated attributes for user ${cognitoId} in cognito`);

    this.ensureGroups(client, cognitoId, groups);

    // get or create user. (When user exists only in cognito, we create it to the database).
    const currentUser =
      (await this.userRepository.findOneBy({
        id: cognitoId,
      })) ?? (await this.userRepository.create({ id: cognitoId }));
    currentUser.iban = iban;
    currentUser.name = name;
    await this.userRepository.save(currentUser);

    this.log.log(`Updated attributes for user ${cognitoId} in database`);

    return {
      id: currentUser.id,
      iban: currentUser.iban,
      email: email,
      name: name,
      groups: groups,
    };
  }

  /** Either adds or removes the given user to a group */
  async ensureOneGroupMembership(
    client: CognitoIdentityProviderClient,
    username: string,
    group: string,
    memberOfGroup: boolean,
  ) {
    if (memberOfGroup) {
      this.log.log(`Adding ${username} to group ${group}`);
      await client.send(
        new AdminAddUserToGroupCommand({
          Username: username,
          GroupName: group,
          UserPoolId: USER_POOL_ID,
        }),
      );
    } else {
      this.log.log(`Removing ${username} from group ${group}`);
      await client.send(
        new AdminRemoveUserFromGroupCommand({
          Username: username,
          GroupName: group,
          UserPoolId: USER_POOL_ID,
        }),
      );
    }
  }

  /** Ensures that the given user in only the in the provided list of groups. */
  async ensureGroups(
    client: CognitoIdentityProviderClient,
    username: string,
    groups: Group[],
  ): Promise<void> {
    for (const group in Group) {
      const groupString = Group[group];
      await this.ensureOneGroupMembership(
        client,
        username,
        groupString,
        groups.indexOf(groupString) !== -1,
      );
    }
  }
}
