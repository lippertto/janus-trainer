import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminCreateUserResponse,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminUpdateUserAttributesCommand,
  AttributeType,
  CognitoIdentityProviderClient,
  ListGroupsCommand,
  ListGroupsResponse,
  ListUsersCommand,
  ListUsersCommandOutput,
  ListUsersInGroupCommand,
  ListUsersInGroupResponse,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { Group } from '@/lib/dto';
import { ApiConflictError, ApiErrorInternalServerError, ApiErrorNotFound } from '@/lib/helpers-for-api';


const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

export type ParsedCognitoUser = {
  username: string;
  email: string;
  groups: Group[];
  name: string;
  enabled: boolean;
};

function getCognitoAttributeOrNull(
  attributes: AttributeType[],
  name: string,
  username: string,
): string | null {
  const matchingAttribute = attributes.find((a) => a.Name === name);
  if (!matchingAttribute) {
    console.log(`Bad cognito user ${username}. Missing attribute '${name}'`);
    return null;
  }
  return matchingAttribute.Value!;
}

/** Parse the information of one cognito user.
 * This method is intended to be used directly with cognito output,
 * hence all parameters are optional but may cause null to be returned.
 */
function convertOneCognitoUser(
  username?: string,
  attributes?: AttributeType[],
  enabled?: boolean,
): ParsedCognitoUser | null {
  if (!username || !attributes) {
    return null;
  }
  const email = getCognitoAttributeOrNull(
    attributes,
    'email',
    username,
  );
  const name = getCognitoAttributeOrNull(
    attributes,
    'name',
    username,
  );
  if (!email || !name) {
    console.log(`User ${username} does not have all required properties`)
    return null;
  }

  return {
    username: username,
    email: email,
    name: name,
    groups: [],
    enabled: enabled ?? false,
  };
}

async function listCognitoUsers(
  client: CognitoIdentityProviderClient,
  filterString: string,
  showDisabled: boolean = false,
) {
  const result: ParsedCognitoUser[] = [];
  let paginationToken = undefined;
  do {
    const response: ListUsersCommandOutput = await client.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        PaginationToken: paginationToken,
        Filter: filterString
      }),
    );
    paginationToken = response.PaginationToken;
    const usersOfThisBatch = response
      .Users!
      .filter(
        u => showDisabled || u.Enabled)
      .map((u) => (convertOneCognitoUser(
        u.Username!,
        u.Attributes ?? [],
        u.Enabled ?? false
      )))
      .filter((u) => u !== null) as ParsedCognitoUser[];
    result.push(
      ...usersOfThisBatch,
    );
  } while (paginationToken);
  return result;
}

/** Returns all users in cognito. Note, the groups will be empty . */
export async function listAllUsers(
  client: CognitoIdentityProviderClient,
): Promise<ParsedCognitoUser[]> {
  return listCognitoUsers(client, "")
}

/** Get a user by email.
 * This method will return disabled users too.
 * Note: Emails are unique within a cognito user pool. Hence, we have at most one user.
 */
export async function getUserByEmail(
  client: CognitoIdentityProviderClient, email: string
): Promise<ParsedCognitoUser|null> {
  const users = await listCognitoUsers(client, `email = \"${email}\"`, true)
  if (users.length === 1) {
    return users[0]
  } else {
    return null;
  }
}

export async function listGroups(
  client: CognitoIdentityProviderClient,
): Promise<string[]> {
  let response: ListGroupsResponse;
  try {
    response = await client.send(
      new ListGroupsCommand({
        UserPoolId: USER_POOL_ID,
      }),
    );
  } catch (e) {
    console.log(JSON.stringify(e));
    throw new ApiErrorInternalServerError(`Failed to list cognito groups.`);
  }
  return response!.Groups!.map((it) => it.GroupName) as string[];
}

/** Returns all users ids for the given group. */
export async function findUsersForGroup(
  client: CognitoIdentityProviderClient,
  group: string,
): Promise<string[]> {
  const result: string[] = [];
  let nextToken = undefined;

  do {
    const response: ListUsersInGroupResponse = await client.send(
      new ListUsersInGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: group,
        NextToken: nextToken,
      }),
    );
    result.push(...response.Users!
      .filter((user) => user.Enabled)
      .map((user) => user.Username!)
    );
    nextToken = response.NextToken;
  } while (nextToken);

  return result;
}

/**
 * Create the given user in cognito.
 * Note: The user has not been assigned ot any groups yet.
 * @returns the cognito username of the created user.
 */
export async function createCognitoUser(
  client: CognitoIdentityProviderClient,
  email: string,
  name: string,
): Promise<ParsedCognitoUser> {
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
      console.log(
        `Could not create user. User with email ${email} already exists.`,
      );
      throw new ApiConflictError(
        `User with email ${email} already exists`,
        'UsernameAlreadyExists',
      );
    }
    if (e instanceof Error) {
      throw new ApiErrorInternalServerError(
        `Failed to create user: ${e.message}`,
      );
    }
    throw new ApiErrorInternalServerError('');
  }

  const username = createResponse!.User!.Username!;
  return { username, email, groups: [], name, enabled: true };
}

export async function disableCognitoUser(
  client: CognitoIdentityProviderClient,
  id: string,
) {
  const disableUserCommand = new AdminDisableUserCommand({
    UserPoolId: USER_POOL_ID,
    Username: id,
  });
  try {
    await client.send(disableUserCommand);
  } catch (e) {
    if (e instanceof Error) {
      throw new ApiErrorInternalServerError(
        `Failed to disable user in cognito: ${e.message}`,
      );
    }
    throw new ApiErrorInternalServerError('');
  }
}

export async function getCognitoUserById(
  client: CognitoIdentityProviderClient,
  username: string
): Promise<ParsedCognitoUser|null> {
  try {
    const response = await client.send(
      new AdminGetUserCommand({
        Username: username,
        UserPoolId: USER_POOL_ID,
      }),
    );

    return convertOneCognitoUser(
      response.Username!!,
      response.UserAttributes,
      response.Enabled
    )
  } catch (e) {
    console.log(`Error while getting cognito user ${username}`, e)
    return null;
  }
}

export async function updateCognitoUser(
  client: CognitoIdentityProviderClient,
  id: string,
  email: string,
  name: string,
  groups: Group[],
): Promise<void> {
  const user = await getCognitoUserById(client, id);
  if (!user) {
    throw new ApiErrorNotFound(
      `Could not update user because it does not exist in Cognito`,
    );
  }

  const attributes = [
    { Name: 'email', Value: email },
    { Name: 'name', Value: name },
  ];

  await client.send(
    new AdminUpdateUserAttributesCommand({
      Username: id,
      UserPoolId: USER_POOL_ID,
      UserAttributes: attributes,
    }),
  );

  return setGroupsForUser(client, id, groups);
}


/** Ensures that the given user in only the in the provided list of groups. */
export async function setGroupsForUser(
  client: CognitoIdentityProviderClient,
  username: string,
  groups: Group[],
): Promise<void> {
  for (const groupString in Group) {
    const group = Group[groupString as any as keyof typeof Group];
    await ensureOneGroupMembership(
      client,
      username,
      group,
      groups.indexOf(group) !== -1,
    );
  }
}


/** Either adds or removes the given user to a group */
async function ensureOneGroupMembership(
  client: CognitoIdentityProviderClient,
  username: string,
  group: Group,
  memberOfGroup: boolean,
) {
  if (memberOfGroup) {
    await client.send(
      new AdminAddUserToGroupCommand({
        Username: username,
        GroupName: group,
        UserPoolId: USER_POOL_ID,
      }),
    );
  } else {
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        Username: username,
        GroupName: group,
        UserPoolId: USER_POOL_ID,
      }),
    );
  }
}

export function createCognitoClient() {
  return new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? 'eu-north-1',
  });
}

export async function enableCognitoUser(
  client: CognitoIdentityProviderClient,
  username: string,
) {
  const command = new AdminEnableUserCommand(
    {
      UserPoolId: USER_POOL_ID,
      Username: username,
    }
  )
  try {
    await client.send(command);
  } catch (e) {
    if (e instanceof Error) {
      throw new ApiErrorInternalServerError(
        `Failed to enable user in cognito: ${e.message}`,
      );
    }
    throw new ApiErrorInternalServerError('unknown error');
  }
}

export async function listGroupsForUser(
  client: CognitoIdentityProviderClient,
  username: string): Promise<Group[]> {
  const result = []
  const groups = await listGroups(client);
  for (const thisGroup of groups) {
    const usernamesOfThisGroup = await findUsersForGroup(client, thisGroup);
    if (usernamesOfThisGroup.indexOf(username) !== -1) {
      result.push(thisGroup);
    }
  }
  return result as Group[];
}