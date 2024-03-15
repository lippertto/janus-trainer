import { AppUserDto } from 'janus-trainer-dto';

export async function getAppUser(
  accessToken: string,
  appUserId: string,
): Promise<AppUserDto | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/app-users/${appUserId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (response.status === 404) {
      return null;
    } else if (response.status !== 200) {
      return Promise.reject(
        new Error(`Failed to get app-user: ${await response.text()}`),
      );
    }
    return await response.json();
  } catch (e) {
    console.log(JSON.stringify(e));
    throw e;
  }
}
