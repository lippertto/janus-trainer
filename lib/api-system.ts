export async function clearDatabase(accessToken: string): Promise<void> {
  const response = await fetch(`/api/system/clear-database`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status != 200) {
    return Promise.reject(new Error(await response.text()));
  }
}
