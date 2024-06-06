import { CompensationQueryResponse, CompensationDto } from './dto';

export async function getCompensations(
  accessToken: string,
): Promise<CompensationDto[]> {
  const response = await fetch(`/api/compensations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status !== 200) {
    return Promise.reject(new Error(await response.text()));
  }
  const result = (await response.json()) as CompensationQueryResponse;
  return result.value;
}
