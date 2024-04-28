import { CompensationQueryResponse, CompensationDtoNew } from './dto';

export async function getCompensations(
  accessToken: string,
): Promise<CompensationDtoNew[]> {
  const response = await fetch(`/api/compensations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status !== 200) {
    return Promise.reject(new Error(await response.text()));
  }
  const result = (await response.json()) as CompensationQueryResponse;
  return result.value;
}
