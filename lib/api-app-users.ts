import { AppUser } from './dto';

export async function getAppUser(
  accessToken: string,
  appUserId: string,
): Promise<AppUser | null> {
  try {
    const response = await fetch(`/api/app-users/${appUserId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

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
