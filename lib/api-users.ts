import { UserDto, UserCreateRequest, UserQueryResponseDto } from './dto';
import { Group } from './dto';

export async function getAllUsers(accessToken: string): Promise<UserDto[]> {
  const response = await fetch(`/api/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.status != 200) {
    return Promise.reject(
      new Error('Could not retrieve users. ' + (await response.text())),
    );
  }

  const result = await response.json() as UserQueryResponseDto;
  return result.value;
}

export async function updateUser(
  accessToken: string,
  id: string,
  name: string,
  email: string,
  isTrainer: boolean,
  isAdmin: boolean,
  iban?: string,
): Promise<UserDto> {
  const groups = [];
  if (isTrainer) {
    groups.push(Group.TRAINERS);
  }
  if (isAdmin) {
    groups.push(Group.ADMINS);
  }

  // create request is currently the same as update request
  const request: UserCreateRequest = {
    email: email.trim(),
    name: name.trim(),
    iban: iban?.trim(),
    groups: groups,
  };

  const response = await fetch(
    `/api/users/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(request),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
  if (response.status != 200) {
    return Promise.reject(
      new Error('Could not update user: ' + (await response.text())),
    );
  }
  return (await response.json()) as UserDto;
}

export async function createUser(
  accessToken: string,
  name: string,
  email: string,
  isTrainer: boolean,
  isAdmin: boolean,
  iban?: string,
): Promise<UserDto> {
  const groups = [];
  if (isTrainer) {
    groups.push(Group.TRAINERS);
  }
  if (isAdmin) {
    groups.push(Group.ADMINS);
  }

  const response = await fetch(`/api/users`, {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      name: name.trim(),
      iban: iban?.trim(),
      groups: groups,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status != 201) {
    return Promise.reject(
      new Error(
        'Could not create user: ' + (await response.json()).error?.message,
      ),
    );
  }

  return (await response.json()) as UserDto;
}

export async function deleteUser(
  accessToken: string,
  id: string,
): Promise<void> {
  const response = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.status !== 204) {
    return Promise.reject('Could not delete user: ' + (await response.text()));
  }
}

export async function checkIfUserExists(userId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/users/${userId}`,
      {
        method: 'HEAD',
      },
    );
    return response.status === 200;
  } catch (e) {
    return false;
  }
}
